import { useSyncExternalStore } from 'react';
import type { AppData, Session, User, Category, Product, Order, StoreSettings } from '@/types';
import { createSeedData } from './seed';
import { cloudEnabled, fetchCloud, saveCloud, subscribeCloud, type CloudRow } from './cloud';

// v2 key is kept deliberately: we migrate old data in place so the client's
// edits (store name, users, settings, orders) survive app updates.
const DATA_KEY = 'luma.data.v2';
const SESSION_KEY = 'luma.session.v1';

/** Base-aware URL for files in /public (works at a domain root or a /subpath/). */
export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

/**
 * DataAdapter is the seam between the UI and the storage backend.
 * The demo uses LocalAdapter (localStorage). For production, implement this
 * interface with fetch() calls to your API and swap it in createStore().
 */
export interface DataAdapter {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  reset(): Promise<AppData>;
}

/** Known seed products that should live under a subcategory (v4 migration). */
const SUBCATEGORY_BY_PRODUCT: Record<string, string> = {
  'p-lip-velvet': 'c-lips-matte', 'p-lip-coral': 'c-lips-matte', 'p-lip-nude': 'c-lips-matte',
  'p-lipgloss': 'c-lips-gloss', 'p-serum-glow': 'c-skin-serum', 'p-serum-ha': 'c-skin-serum',
  'p-cream': 'c-skin-cream', 'p-cleanser': 'c-skin-cream',
  'p-perfume-rose': 'c-fragrance-women', 'p-perfume-amber': 'c-fragrance-oud',
};

/**
 * Migrate legacy data in place, preserving every client edit. Applied to both
 * local and cloud data so an old shared document is upgraded on first load.
 */
function migrateData(parsed: AppData): AppData {
  const seed = createSeedData();
  parsed.products = (parsed.products || []).map((p) => ({
    ...p,
    images: (p.images || []).map((im) => im.startsWith('./') ? im.slice(1) : im),
  }));
  parsed.orders = (parsed.orders || []).map((o) => ({
    ...o,
    lines: (o.lines || []).map((l) => ({
      ...l, sku: l.sku ?? '', priceTier: l.priceTier ?? '', currency: l.currency ?? 'USD',
    })),
    address: {
      ...o.address,
      latitude: o.address?.latitude ?? null,
      longitude: o.address?.longitude ?? null,
      mapLabel: o.address?.mapLabel ?? '',
    },
  }));
  parsed.categories = (parsed.categories || []).map((c) => ({ ...c, parentId: c.parentId ?? null }));
  // v5: wholesale reference fields on users and variants.
  parsed.users = (parsed.users || []).map((u) => ({
    ...u,
    customerGroupId: u.customerGroupId ?? null,
    accountStatus: u.accountStatus ?? 'active',
    companyName: u.companyName ?? '',
  }));
  parsed.products = (parsed.products || []).map((p) => ({
    ...p,
    variants: (p.variants || []).map((v) => ({ ...v, packSize: v.packSize ?? 1, moq: v.moq ?? 1 })),
  }));
  const seedGroups = seed.customerGroups || [];
  const groupIds = new Set((parsed.customerGroups || []).map((g) => g.id));
  parsed.customerGroups = [...(parsed.customerGroups || []), ...seedGroups.filter((g) => !groupIds.has(g.id))];
  const seedRules = seed.priceRules || [];
  const ruleIds = new Set((parsed.priceRules || []).map((r) => r.id));
  parsed.priceRules = [...(parsed.priceRules || []), ...seedRules.filter((r) => !ruleIds.has(r.id))]
    .map((r) => ({ ...r, price: r.price ?? null, discountPct: r.discountPct ?? 0 }));
  const catIds = new Set(parsed.categories.map((c) => c.id));
  parsed.categories = [...parsed.categories, ...seed.categories.filter((c) => !catIds.has(c.id))];
  parsed.enquiries = parsed.enquiries || [];
  let migratedFavorites: string[] = parsed.favoriteIds || [];
  if (!parsed.favoriteIds) {
    try {
      const old = JSON.parse(localStorage.getItem('luma.favorites.v1') || '[]');
      if (Array.isArray(old)) migratedFavorites = old.filter((x) => typeof x === 'string');
    } catch { /* ignore */ }
  }
  parsed.favoriteIds = migratedFavorites;
  // Move known seed products into their subcategories; leave custom products alone.
  parsed.products = (parsed.products || []).map((p) =>
    SUBCATEGORY_BY_PRODUCT[p.id] && parsed.categories.find((c) => c.id === SUBCATEGORY_BY_PRODUCT[p.id])
      ? { ...p, categoryId: SUBCATEGORY_BY_PRODUCT[p.id] }
      : p
  );
  parsed.settings = { ...seed.settings, ...parsed.settings };
  parsed.version = 5;
  return parsed;
}

export class LocalAdapter implements DataAdapter {
  async load(): Promise<AppData> {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (raw) return migrateData(JSON.parse(raw) as AppData);
    } catch {
      // corrupted data falls back to seed
    }
    const seed = createSeedData();
    await this.save(seed);
    return seed;
  }
  async save(data: AppData): Promise<void> {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }
  async reset(): Promise<AppData> {
    const seed = createSeedData();
    await this.save(seed);
    return seed;
  }
}

/**
 * CloudAdapter keeps one shared document in Supabase and mirrors it into
 * localStorage as an offline cache. A realtime subscription pushes changes
 * from the laptop to the phone (and back) without a refresh.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'conflict' | 'error';

export class CloudAdapter implements DataAdapter {
  private lastUpdatedAt: string | null = null;
  private onRemoteChange: ((data: AppData) => void) | null = null;
  private onStatus: ((status: SaveStatus) => void) | null = null;
  private saveQueue: Promise<void> = Promise.resolve();
  // The latest unsent snapshot waits here; a sequence number prevents a newer
  // write arriving mid-flush from being cleared by an older flush completing.
  private pending: AppData | null = null;
  private pendingSeq = 0;
  private savedSeq = 0;

  setStatusListener(fn: (status: SaveStatus) => void) { this.onStatus = fn; }

  /** Called by Store so incoming realtime rows update React state. */
  setRemoteListener(fn: (data: AppData) => void) {
    this.onRemoteChange = fn;
    subscribeCloud((row: CloudRow) => {
      // Ignore our own writes echoed back by realtime.
      if (row.updated_at === this.lastUpdatedAt) return;
      this.lastUpdatedAt = row.updated_at;
      localStorage.setItem(DATA_KEY, JSON.stringify(row.data));
      this.onRemoteChange?.(row.data);
    });
  }

  async load(): Promise<AppData> {
    const remote = await fetchCloud();
    if (remote?.data && Object.keys(remote.data).length) {
      this.lastUpdatedAt = remote.updated_at;
      // Migrate an old shared document in place, then publish it back so every
      // device converges on the same upgraded data.
      const migrated = migrateData(structuredClone(remote.data));
      localStorage.setItem(DATA_KEY, JSON.stringify(migrated));
      if (migrated.version !== remote.data.version || JSON.stringify(migrated) !== JSON.stringify(remote.data)) {
        void this.save(migrated);
      }
      return migrated;
    }
    // Offline or empty cloud: use the local cache, then the seed.
    const cached = await new LocalAdapter().load();
    // If the cloud row exists but is empty, publish this device's data so the
    // other device can see it straight away (no need to wait for an edit).
    if (remote && (!remote.data || !Object.keys(remote.data).length)) {
      void this.save(cached);
    }
    return cached;
  }

  async save(data: AppData): Promise<void> {
    // Keep the offline cache current immediately, even if the write fails.
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    this.pending = data;
    const seq = ++this.pendingSeq;
    // Serialize writes so two fast edits from this device cannot race and
    // produce a stale updated_at conflict with our own previous write.
    this.saveQueue = this.saveQueue.then(() => this.flush(seq));
    return this.saveQueue;
  }

  /** Attempt to publish the latest snapshot, rebasing on remote conflicts. */
  private async flush(seq: number): Promise<void> {
    if (!this.pending || seq < this.savedSeq) return;
    this.onStatus?.('saving');
    let payload = this.pending;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await saveCloud(payload, this.lastUpdatedAt);
      if (result.ok && result.row) {
        this.lastUpdatedAt = result.row.updated_at;
        // Only clear pending if no newer write arrived while this was in flight.
        if (seq === this.pendingSeq) { this.pending = null; this.savedSeq = seq; }
        this.onStatus?.('saved');
        return;
      }
      if (result.conflict && result.row) {
        // Another device won the race. Never discard this device's edit:
        // merge our pending snapshot onto the newer remote row, then retry.
        this.lastUpdatedAt = result.row.updated_at;
        payload = this.rebase(payload, result.row.data);
        if (seq === this.pendingSeq) this.pending = payload;
        localStorage.setItem(DATA_KEY, JSON.stringify(payload));
        this.onRemoteChange?.(payload);
        continue;
      }
      // Network/offline or unknown failure: keep the snapshot queued in
      // localStorage and surface the failure instead of silently dropping it.
      this.onStatus?.('offline');
      return;
    }
    // Exhausted retries: tell the user, keep the local copy intact.
    this.onStatus?.('conflict');
  }

  /**
   * Merge a locally-pending snapshot onto a newer remote row. Collection edits
   * made on this device win for the entities they touched; everything else
   * comes from the remote row. This is a best-effort demo merge, not a CRDT.
   */
  private rebase(local: AppData, remote: AppData): AppData {
    const merged = structuredClone(remote);
    const byId = <T extends { id: string }>(a: T[], b: T[]): T[] => {
      const map = new Map(b.map((x) => [x.id, x]));
      a.forEach((x) => map.set(x.id, x)); // local wins on id collision
      return [...map.values()];
    };
    // Local snapshot is the device's current truth: use its collections
    // wholesale, which also preserves local deletions. Remote-only entities
    // added by another device since our snapshot are merged in by id.
    merged.users = byId(local.users, remote.users);
    merged.products = byId(local.products, remote.products);
    merged.categories = byId(local.categories, remote.categories);
    merged.orders = byId(local.orders, remote.orders);
    merged.enquiries = byId(local.enquiries, remote.enquiries);
    merged.priceRules = byId(local.priceRules, remote.priceRules);
    merged.customerGroups = byId(local.customerGroups, remote.customerGroups);
    merged.settings = { ...remote.settings, ...local.settings };
    merged.favoriteIds = local.favoriteIds;
    merged.version = Math.max(local.version, remote.version);
    return merged;
  }

  async reset(): Promise<AppData> {
    const seed = createSeedData();
    await this.save(seed);
    return seed;
  }
}

type Listener = () => void;

class Store {
  private data: AppData | null = null;
  private session: Session | null = null;
  private listeners = new Set<Listener>();
  private sessionListeners = new Set<Listener>();
  private ready = false;
  private readyListeners = new Set<Listener>();
  private adapter: DataAdapter;

  getAdapter(): DataAdapter { return this.adapter; }

  constructor(adapter: DataAdapter) {
    this.adapter = adapter;
    if (adapter instanceof CloudAdapter) {
      // Realtime rows replace in-memory state and re-render every subscriber.
      adapter.setRemoteListener((data) => {
        this.data = data;
        if (this.session) {
          const u = data.users.find((x) => x.id === this.session!.userId);
          if (!u || !u.active) this.setSession(null);
        }
        this.listeners.forEach((l) => l());
      });
    }
    const rawSession = localStorage.getItem(SESSION_KEY);
    if (rawSession) {
      try { this.session = JSON.parse(rawSession) as Session; } catch { /* ignore */ }
    }
    void this.init();
  }

  private async init() {
    this.data = await this.adapter.load();
    // Clear a stale session if the user was removed or deactivated.
    if (this.session) {
      const u = this.data.users.find((x) => x.id === this.session!.userId);
      if (!u || !u.active) this.setSession(null);
    }
    this.ready = true;
    // Notify data subscribers too: providers mounted above the ready gate
    // (CartProvider, FavoritesProvider) subscribed while data was still null
    // and would otherwise never re-render with the loaded data.
    this.listeners.forEach((l) => l());
    this.readyListeners.forEach((l) => l());
  }

  subscribe = (l: Listener) => { this.listeners.add(l); return () => this.listeners.delete(l); };
  getSnapshot = () => this.data;
  subscribeSession = (l: Listener) => { this.sessionListeners.add(l); return () => this.sessionListeners.delete(l); };
  getSessionSnapshot = () => this.session;
  subscribeReady = (l: Listener) => { this.readyListeners.add(l); return () => this.readyListeners.delete(l); };
  getReady = () => this.ready;

  private commit(next: AppData) {
    this.data = next;
    void this.adapter.save(next);
    this.listeners.forEach((l) => l());
  }

  setSession(session: Session | null) {
    this.session = session;
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
    this.sessionListeners.forEach((l) => l());
  }

  login(email: string, password: string): { ok: boolean; error?: string } {
    const user = this.data?.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) return { ok: false, error: 'بيانات الدخول غير صحيحة' };
    if (!user.active) return { ok: false, error: 'هذا الحساب معطّل' };
    this.setSession({ userId: user.id, role: user.role, name: user.name });
    return { ok: true };
  }

  registerCustomer(name: string, email: string, password: string): { ok: boolean; error?: string } {
    if (this.data?.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return { ok: false, error: 'البريد الإلكتروني مستخدم بالفعل' };
    }
    const user: User = {
      id: `u-${Date.now()}`, name, email: email.trim(), password, role: 'customer', active: true,
      createdAt: new Date().toISOString(), avatarColor: '#c9953f',
      customerGroupId: null, accountStatus: 'pending', companyName: '',
    };
    this.commit({ ...this.data!, users: [...this.data!.users, user] });
    this.setSession({ userId: user.id, role: 'customer', name: user.name });
    return { ok: true };
  }

  logout() { this.setSession(null); }

  // ---- generic collection helpers ----
  private update(mutator: (d: AppData) => AppData) {
    if (!this.data) return;
    this.commit(mutator(this.data));
  }

  upsertUser(user: User) {
    this.update((d) => ({ ...d, users: d.users.some((u) => u.id === user.id)
      ? d.users.map((u) => u.id === user.id ? user : u) : [...d.users, user] }));
  }
  deleteUser(id: string) {
    this.update((d) => ({ ...d, users: d.users.filter((u) => u.id !== id) }));
  }
  upsertCategory(category: Category) {
    this.update((d) => ({ ...d, categories: d.categories.some((c) => c.id === category.id)
      ? d.categories.map((c) => c.id === category.id ? category : c) : [...d.categories, category] }));
  }
  deleteCategory(id: string) {
    this.update((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));
  }
  upsertProduct(product: Product) {
    this.update((d) => ({ ...d, products: d.products.some((p) => p.id === product.id)
      ? d.products.map((p) => p.id === product.id ? product : p) : [...d.products, product] }));
  }
  deleteProduct(id: string) {
    this.update((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }));
  }
  upsertOrder(order: Order) {
    this.update((d) => ({ ...d, orders: d.orders.some((o) => o.id === order.id)
      ? d.orders.map((o) => o.id === order.id ? order : o) : [...d.orders, order] }));
  }
  deleteOrder(id: string) {
    this.update((d) => ({ ...d, orders: d.orders.filter((o) => o.id !== id) }));
  }
  upsertEnquiry(enquiry: import('@/types').ProductEnquiry) {
    this.update((d) => ({ ...d, enquiries: d.enquiries.some((e) => e.id === enquiry.id)
      ? d.enquiries.map((e) => e.id === enquiry.id ? enquiry : e) : [...d.enquiries, enquiry] }));
  }
  setEnquiryHandled(id: string, handled: boolean) {
    this.update((d) => ({ ...d, enquiries: d.enquiries.map((e) => e.id === id ? { ...e, handled } : e) }));
  }
  deleteEnquiry(id: string) {
    this.update((d) => ({ ...d, enquiries: d.enquiries.filter((e) => e.id !== id) }));
  }
  setFavorites(ids: string[]) {
    this.update((d) => ({ ...d, favoriteIds: ids }));
  }
  setSettings(settings: StoreSettings) {
    this.update((d) => ({ ...d, settings }));
  }
  resetData() {
    void this.adapter.reset().then((seed) => {
      this.data = seed;
      this.setSession(null);
      this.listeners.forEach((l) => l());
    });
  }

  // Decrement stock when an order is placed.
  applyOrderStock(lines: { productId: string; variantId: string; quantity: number }[]) {
    this.update((d) => ({
      ...d,
      products: d.products.map((p) => {
        const touched = lines.filter((l) => l.productId === p.id);
        if (!touched.length) return p;
        return {
          ...p,
          variants: p.variants.map((v) => {
            const line = touched.find((l) => l.variantId === v.id);
            return line ? { ...v, stock: Math.max(0, v.stock - line.quantity) } : v;
          }),
        };
      }),
    }));
  }
}

// One shared cloud document when configured; otherwise a per-device demo store.
export const store = new Store(cloudEnabled ? new CloudAdapter() : new LocalAdapter());

// Save-status subscription (cloud adapter only).
let saveStatus: SaveStatus = 'idle';
const saveStatusListeners = new Set<() => void>();
if (store.getAdapter() instanceof CloudAdapter) {
  (store.getAdapter() as CloudAdapter).setStatusListener((s) => {
    saveStatus = s;
    saveStatusListeners.forEach((l) => l());
  });
}
const subscribeSaveStatus = (l: () => void) => { saveStatusListeners.add(l); return () => { saveStatusListeners.delete(l); }; };
const getSaveStatus = () => saveStatus;
export function useSaveStatus(): SaveStatus {
  return useSyncExternalStore(subscribeSaveStatus, getSaveStatus, getSaveStatus);
}

export function useData(): AppData | null {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
export function useSession(): Session | null {
  return useSyncExternalStore(store.subscribeSession, store.getSessionSnapshot, store.getSessionSnapshot);
}
export function useReady(): boolean {
  return useSyncExternalStore(store.subscribeReady, store.getReady, store.getReady);
}

// ---- selectors / helpers ----

/** All top-level categories (parentId === null), sorted. */
export const topCategories = (data: AppData) =>
  data.categories.filter((c) => c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder);

/** Direct children of a category, sorted and active-only. */
export const childCategoriesOf = (data: AppData, id: string) =>
  data.categories.filter((c) => c.parentId === id && c.active).sort((a, b) => a.sortOrder - b.sortOrder);

/** A category plus every descendant id (recursive). */
export function categorySubtreeIds(data: AppData, id: string): string[] {
  const out = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of data.categories) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) { out.add(c.id); changed = true; }
    }
  }
  return [...out];
}

/**
 * Ids whose products should appear when browsing a category. Normally the
 * category's own subtree. For a subcategory with no products assigned yet,
 * fall back to its parent's subtree so the page is never empty.
 */
export function categoryProductScope(data: AppData, id: string): string[] {
  const cat = data.categories.find((c) => c.id === id);
  const subtree = categorySubtreeIds(data, id);
  const hasProducts = data.products.some((p) => p.isActive && subtree.includes(p.categoryId));
  if (!hasProducts && cat?.parentId) return categorySubtreeIds(data, cat.parentId);
  return subtree;
}

export const effectivePrice = (v: { retailPrice: number; salePrice: number | null }) => v.salePrice ?? v.retailPrice;
export const productMinPrice = (p: Product) => Math.min(...p.variants.map(effectivePrice));
export const productStock = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);
/** Format US cents as USD. Symbol placement follows the store setting. */
export const formatMoney = (cents: number, symbol = '$', position: 'before' | 'after' = 'before') => {
  const amount = (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return position === 'before' ? `${symbol}${amount}` : `${amount} ${symbol}`;
};
