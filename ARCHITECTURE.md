# Architecture

## Layout

```
src/
  main.tsx                 App entry, providers, service-worker registration
  App.tsx                  Routes + role guards
  types.ts                 Domain model (User, Category, Product, Variant, Order, Settings)
  styles/global.css        Design tokens + all component styles
  data/
    seed.ts                Demo catalog, users, orders, default settings
    store.ts               Store class, DataAdapter interface, React hooks, selectors
  state/
    CartContext.tsx        Cart state persisted to localStorage
  components/
    ui/                    Toast, Modal, common cards/buttons, empty states
    layout/                StoreLayout (storefront), DashboardLayout (admin/sales)
    store/                 ProductCard
    dashboard/             ProductEditor, ProductsTable, CategoriesManager, OrdersTable
  pages/
    LoginPage.tsx
    store/                 Home, Listing, Product, Cart, Checkout, Account, Favorites
    sales/                 Overview, Products, Inventory, Categories, Orders
    admin/                 Overview, Orders, Products, Categories, Users, Analytics, Settings
public/
  manifest.webmanifest     PWA manifest (Arabic, RTL, standalone)
  sw.js                    Service worker (cache-first app shell)
  icons/                   App icons (SVG + PNG 192/512)
  images/                  16 local SVG product illustrations (offline-safe)
```

## Data flow

```
Components  →  useData() / store methods  →  Store  →  DataAdapter  →  localStorage
```

`Store` (`src/data/store.ts`) is a small observable store using React's `useSyncExternalStore`. Every mutation goes through a `store.upsertX()` method, which commits new data and notifies subscribers. Components never touch localStorage directly (except cart/favorites, which are intentionally client-only).

### Swapping in a real backend

The seam is the `DataAdapter` interface:

```ts
interface DataAdapter {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  reset(): Promise<AppData>;
}
```

To go live:

1. Implement `ApiAdapter` with `fetch()` calls to your backend for those three methods (or finer-grained endpoints).
2. In `src/data/store.ts`, change `new Store(new LocalAdapter())` to `new Store(new ApiAdapter(...))`.
3. Replace the demo login in `store.login()` / `registerCustomer()` with a real auth call that returns a session + role. Keep the `Session` shape (`userId`, `role`, `name`) and the role guards in `App.tsx` keep working unchanged.
4. Move password storage to the server (bcrypt/argon2), issue an HTTP-only cookie or JWT, and never ship credentials in the client bundle.

Because all UI reads through `useData()` and writes through `store` methods, no page or component needs to change.

### Money

All prices are stored as **integer fils** (1 SAR = 100 fils). `formatMoney()` in `store.ts` formats for display. This avoids floating-point rounding errors. The admin/product forms show SAR and multiply by 100 on save.

## Roles

`Session.role` is one of `admin | sales | customer`. Route guards in `App.tsx`:

- `/admin` — admin only.
- `/sales` — sales or admin (admin can use sales tools).
- `/store` — public.

The guard is a UI convenience, not security. Real authorization must be enforced server-side.

## PWA / offline

- `public/manifest.webmanifest` makes it installable (standalone, RTL, Arabic name, icons).
- `public/sw.js` caches the app shell and serves it offline; navigations are network-first with an offline fallback to `index.html`.
- Product images are local SVGs under `public/images/`, so the catalog renders with no network.
- `vite.config.ts` uses `base: '/'` and all asset paths are root-absolute — correct for a domain root and stable across client-side routes.

## Known demo limitations

- No server, no real auth, no payment gateway, no email/SMS.
- Orders and stock changes are per-browser; two devices don't share data.
- Product images are simple generated illustrations, not client photos.
- Bundle is a single chunk (~250 KB gzip) — fine for a demo; code-split later if needed.
