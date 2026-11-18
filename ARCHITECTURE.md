# Architecture

This is a **front-end wholesale demo**, not a production transactional system or ERP. See "Known demo limitations" at the end.

## Layout

```
src/
  main.tsx                 App entry, providers, service-worker registration
  App.tsx                  Routes + role guards
  types.ts                 Domain model (User, Category, Product, Variant, Order,
                           CustomerGroup, PriceRule, Settings, enquiries, favorites)
  styles/global.css        Design tokens + all component styles (RTL, responsive, print)
  data/
    seed.ts                Demo catalog, users, orders, groups, rules, default settings
    store.ts               Store class, DataAdapter interface, React hooks, selectors,
                           cloud/local adapters, migration, save-status
    cloud.ts               Supabase client + fetch/save/subscribe (one shared JSON row)
    pricing.ts             Pure pricing resolver + checkQuantity + isWholesaleEligible
    pricing.test.ts        Node test-runner unit tests for pricing/MOQ/eligibility
    exportPdf.ts           Print-to-PDF helper for order reports
  state/
    CartContext.tsx        Per-device cart; exposes resolver-priced lines
    FavoritesContext.tsx   Shared favorites (synced through the cloud document)
  components/
    ui/                    Toast, Modal, common cards/buttons, empty states
    layout/                StoreLayout (storefront), DashboardLayout (admin/sales)
    store/                 ProductCard, MegaMenu, LocationPicker (Leaflet/OSM)
    dashboard/             ProductEditor, ProductsTable, CategoriesManager (recursive tree),
                           OrdersTable (handling + printable report)
  pages/
    LoginPage.tsx
    store/                 Home, Listing, Product, Cart, Checkout, Account, Favorites,
                           BulkOrder (quick order / reorder)
    sales/                 Overview, Products, Inventory, Categories, Orders, Enquiries
    admin/                 Overview, Orders, Products, Categories, Users, Analytics, Settings
public/
  manifest.webmanifest     PWA manifest (Arabic, RTL, standalone)
  sw.js                    Service worker (cache-first app shell)
  icons/                   App icons (SVG + PNG 192/512)
  images/                  Local SVG product illustrations (offline-safe)
docs/
  CLOUD_SYNC.md            Shared-cloud design, RLS model, switching projects
  SUPABASE_SCHEMA.sql      Table + policies for the shared document
```

## Data flow

```
Components  →  useData() / store methods  →  Store  →  DataAdapter  →  Supabase (shared JSON) + localStorage cache
```

`Store` (`src/data/store.ts`) is an observable store using React's `useSyncExternalStore`. Every mutation goes through a `store.upsertX()` method, which commits new data and notifies subscribers. Components never touch storage directly (cart is intentionally per-device in localStorage).

### Cloud sync and conflict handling

`CloudAdapter` syncs **one shared document** in Supabase (`public.luma_store`, row id `main`, jsonb `data`). A realtime subscription pushes other devices' edits into the UI immediately; the local copy is kept as an offline cache. See `docs/CLOUD_SYNC.md`.

Writes are serialized through a save queue so two fast edits on one device cannot race. Each save carries the last known `updated_at` as an optimistic-concurrency guard. On a conflict (another device wrote first), the adapter rebases the pending snapshot onto the newer remote row and retries up to three times. A failed save is surfaced through `useSaveStatus()` as a visible banner; the local copy is never silently replaced by stale remote data. This is best-effort demo merging, not a CRDT or a transactional store.

### Data migrations

`migrateData()` runs on both the local cache and the cloud row. The current model is **version 5** (added customer groups, price rules, packaging/MOQ, account status, order-line snapshots, default wholesale percentage, favorites). Migrations preserve all existing client edits; the upgraded document is published back on first load.

### Swapping in a real backend

The seam is the `DataAdapter` interface:

```ts
interface DataAdapter {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  reset(): Promise<AppData>;
}
```

To go live (a separate future project):

1. Implement `ApiAdapter` with finer-grained endpoints (products, orders, pricing, auth) rather than one JSON blob.
2. In `src/data/store.ts`, select `new ApiAdapter(...)` instead of `CloudAdapter`.
3. Replace the demo login in `store.login()` / `registerCustomer()` with real auth returning a session + role. Keep the `Session` shape and the `App.tsx` guards.
4. Move password storage server-side (bcrypt/argon2), issue an HTTP-only cookie or JWT, and enforce authorization server-side.

Because UI reads through `useData()` and writes through `store` methods, most components need little change — but the pricing, stock and credit logic must move server-side to be enforceable.

### Money

All prices are **USD**, stored as integer cents (1 USD = 100 cents). `formatMoney()` in `store.ts` formats for display. The product/editor forms show USD and multiply by 100 on save. Order lines snapshot `currency: 'USD'`.

## Wholesale logic (demo/reference)

- `pricing.ts` resolves unit price: individual customer → customer group → default wholesale; within a tier, most-specific rule wins, then highest satisfied minimum quantity. Rules support fixed price or percentage discount, quantity tiers, inclusive validity dates; inactive groups/expired rules never apply; guests get no customer tier. With no matching rule, price = retail/sale less `settings.defaultWholesalePct` (seeded 10%), never plain retail.
- `checkQuantity()` enforces MOQ, pack-size alignment (suggests the next valid pack) and stock clamping, shared by product page, cart, bulk order and checkout.
- `isWholesaleEligible()` restricts wholesale ordering to `accountStatus: 'active'` customers; status is shown in the account banner and admin user editor.
- Order lines snapshot SKU, quantity, unit price, pricing tier and currency at submit time; later edits never mutate submitted orders. Sales price adjustments appear in the printable report as the quoted total.

## Roles

`Session.role` is `admin | sales | customer`. Guards in `App.tsx`:

- `/admin` — admin only.
- `/sales` — sales or admin.
- `/store` — public.

The guard is a UI convenience, not security. Real authorization must be enforced server-side.

## PWA / offline

- `public/manifest.webmanifest` makes it installable (standalone, RTL, Arabic name, icons).
- `public/sw.js` caches the app shell; navigations are network-first with an offline fallback.
- Product images are local SVGs, so the catalog renders with no network.
- `vite.config.ts` uses `base: '/luma-wholesale/'` (GitHub Pages subpath); all asset paths are base-aware via `assetUrl()` / `import.meta.env.BASE_URL`. HashRouter keeps client routes working without server rewrites.

## Known demo limitations

- Single shared JSON document with whole-document writes; no row-level transactions.
- No atomic stock reservation or concurrency-safe stock decrement; no enforceable credit limits, secure ledger or financial guarantees.
- Demo auth and RLS (public read/write) are not production security; see `docs/CLOUD_SYNC.md`.
- No supplier, purchase-order or full ERP workflows.
- Best-effort conflict merging, not a conflict-free replicated data type.
- Bundle is a single chunk (~350 KB gzip) — fine for a demo; code-split later if needed.
