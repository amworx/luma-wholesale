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

export class LocalAdapter implements DataAdapter {
  async load(): Promise<AppData> {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppData;
        // Migrate legacy data in place; never discard the client's edits.
        parsed.products = (parsed.products || []).map((p) => ({
          ...p,
          images: (p.images || []).map((im) => im.startsWith('./') ? im.slice(1) : im),
        }));
        parsed.orders = (parsed.orders || []).map((o) => ({
          ...o,
          address: {
            ...o.address,
            latitude: o.address?.latitude ?? null,
            longitude: o.address?.longitude ?? null,
            mapLabel: o.address?.mapLabel ?? '',
          },
        }));
        // v2 categories had no parentId; treat them all as top-level.
        parsed.categories = (parsed.categories || []).map((c) => ({ ...c, parentId: c.parentId ?? null }));
        // Merge in any newly seeded subcategories without overwriting existing ones.
        const seed = createSeedData();
        const catIds = new Set(parsed.categories.map((c) => c.id));
        parsed.categories = [...parsed.categories, ...seed.categories.filter((c) => !catIds.has(c.id))];
        parsed.enquiries = parsed.enquiries || [];
        // Carry over favorites from the old standalone localStorage key.
        let migratedFavorites: string[] = parsed.favoriteIds || [];
        if (!parsed.favoriteIds) {
          try {
            const old = JSON.parse(localStorage.getItem('luma.favorites.v1') || '[]');
            if (Array.isArray(old)) migratedFavorites = old.filter((x) => typeof x === 'string');
          } catch { /* ignore */ }
        }
        parsed.favoriteIds = migratedFavorites;
        parsed.settings = { ...seed.settings, ...parsed.settings };
        parsed.version = 3;
        return parsed;
      }
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
export class CloudAdapter implements DataAdapter {
  private lastUpdatedAt: string | null = null;
  private onRemoteChange: ((data: AppData) => void) | null = null;

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
      // Clear any stale session whose user no longer exists in shared data.
      localStorage.setItem(DATA_KEY, JSON.stringify(remote.data));
      return remote.data;
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
    // Always keep the offline cache current, even if the write fails.
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    const result = await saveCloud(data, this.lastUpdatedAt);
    if (result.ok && result.row) {
      this.lastUpdatedAt = result.row.updated_at;
    } else if (result.conflict && result.row) {
      // A newer remote row exists (another device edited first): adopt it.
      this.lastUpdatedAt = result.row.updated_at;
      localStorage.setItem(DATA_KEY, JSON.stringify(result.row.data));
      this.onRemoteChange?.(result.row.data);
    }
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
export const effectivePrice = (v: { retailPrice: number; salePrice: number | null }) => v.salePrice ?? v.retailPrice;
export const productMinPrice = (p: Product) => Math.min(...p.variants.map(effectivePrice));
export const productStock = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);
/** Format US cents as USD. Symbol placement follows the store setting. */
export const formatMoney = (cents: number, symbol = '$', position: 'before' | 'after' = 'before') => {
  const amount = (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return position === 'before' ? `${symbol}${amount}` : `${amount} ${symbol}`;
};
