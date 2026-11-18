# لُما — متجر مستحضرات التجميل بالجملة (نسخة تجريبية)

Arabic-first **wholesale** cosmetics storefront, Android-installable PWA, sales dashboard and admin dashboard in one codebase. Prices are in **USD**; the demo context is **Syria**.

## Live demo

**https://amworx.github.io/luma-wholesale/**

Free GitHub Pages hosting, HTTPS, installable on Android. Open in Chrome → menu → "Install app" / "Add to Home screen".

## Storefront features

- **Product image viewer** — fullscreen lightbox with zoom, rotate, next/previous, share and keyboard controls.
- **Favorites** — a heart on every product card and product page; saved to localStorage and shown in the Favorites page.
- **Product enquiries** — customers request info or leave feedback on a product; the message lands in the sales/admin "الاستفسارات" panel.
- **Location map** — checkout uses a free OpenStreetMap picker (search, "my location", click-to-pin, no API key); postal code was removed. Picked coordinates and place name are saved into the printable order report.
- **Category tree (unlimited depth)** — manage a recursive parent/child category tree in either dashboard; add subcategories of subcategories to any depth, reorder siblings, collapse branches, and cycle-safe parent selection. Category pages show subcategory chips and a redesigned filter panel (price, availability switch, brands, sort) with a mobile bottom sheet.
- **Multi-image gallery** — products can carry several images; the detail page shows thumbnails, a fullscreen viewer with next/previous, zoom, rotate and share.
- **Mobile-first** — responsive product grid, single-column product/checkout layouts, sticky mobile filter bar and large touch targets.
- **Persistent settings** — store name, users and other admin edits survive refresh; stored data is migrated in place across app updates so nothing is lost.

## What this is

A complete **demo** for a retail cosmetics trader. One React app serves three audiences:

| Surface | Route | Who |
|---|---|---|
| Storefront | `/store` | Customers — browse, search, filter, cart, checkout |
| Sales dashboard | `/sales` | Sales team — products, variants, inventory, categories, orders |
| Admin dashboard | `/admin` | Owner — everything above plus users, analytics, settings |

The whole thing is Arabic, RTL, and free to run. Data is shared across devices through a free Supabase project with realtime sync, so laptop edits appear on the phone automatically. An offline cache keeps it working when the network is down. See `docs/CLOUD_SYNC.md`.

## Why a PWA (and not a native APK)

The brief was: *works completely free, on any Android device, ready for live hosting/domain*. A PWA is the honest fit:

- **Free** — no Play Store fee, no native build toolchain, no signing keys.
- **Any Android device** — installs from Chrome's "Add to Home screen"; runs like a full-screen app with an icon and offline support.
- **One codebase** — the website and the "app" are the same thing. No duplicate maintenance.
- **Hosting-ready** — it's a static site. Deploy to any host, attach a domain, done.

If the client later insists on a Play Store listing, this same codebase can be wrapped in a thin Android WebView (Capacitor/Trusted Web Activity) without rewriting the UI.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server binds to `0.0.0.0`, so you can also open it from a phone on the same Wi-Fi using the network URL Vite prints.

## Demo logins

The login screen has one-click buttons for each role. Or type manually:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@luma.sy` | `admin123` |
| Sales | `sales@luma.sy` | `sales123` |
| Customer | `customer@example.com` | `customer123` |

You can also register a new customer account from the login screen.

## What works end-to-end

- Browse 16 seeded products across 6 categories, with variants (colors/sizes), SKUs, cost/retail/sale prices, stock counts, low-stock thresholds, shipping rules, ratings.
- Search, category filtering, price filter, availability filter, sorting, offers.
- Product detail with variant selection, quantity, add-to-cart, related products, tabs.
- Cart with quantity controls, free-shipping threshold, checkout with address + payment method.
- **Wholesale flow, no direct selling:** customers pick multiple products, enter a detailed Syrian shipping address (company, two phones, email, governorate, area, street, building, landmark, delivery time) and submit a purchase **request**. No payment is collected and stock is **not** auto-decremented.
- Submitting generates a **printable order report** (customer + address + product lines + USD totals) with **PDF export** on every report surface (customer account, checkout confirmation, admin/sales order detail). The order appears in both dashboards as "new".
- The **sales team handles orders manually**: open the order report, set the final agreed price, choose the payment method, assign a salesperson, add internal notes, and update the status.
- Sales team can add/edit/delete products (full editor: images, variants, prices, stock, shipping, flags), manage inventory directly, manage categories, view/update order status.
- Admin can do all of the above plus manage users/roles, view analytics, edit store settings and announcements, and reset all data.
- Favorites and account order history per customer.
- PWA install + offline app shell via service worker.
- Routing uses **hash mode** and all asset paths are base-aware (`import.meta.env.BASE_URL`), so it works at the `/luma-wholesale/` subpath with no server rewrite rules.

## Wholesale pricing, groups and packaging (demo/reference data)

All prices are **USD** (stored as integer cents). The pricing resolver in `src/data/pricing.ts` is a pure function; the price shown in the cart is exactly the price snapshotted into the submitted order line.

- **Price priority:** individual customer rule → customer-group rule → default wholesale rule. Within a tier, the most specific rule wins (variant → product → all products), then the highest satisfied minimum quantity.
- **Genuine wholesale fallback:** when no rule matches, the price is the retail/sale price less the configurable default wholesale discount (`settings.defaultWholesalePct`, seeded 10%), never the plain retail price. The applied source ("سعر تفاوضي خاص" / group / default) is shown on the product, cart and bulk-order pages.
- **Rules** support a fixed price or a percentage discount, quantity tiers, and inclusive validity dates. Inactive groups and expired/inactive rules never apply. Guests never receive customer-tier pricing.
- **MOQ & pack size:** each variant has a minimum order quantity and pack size. `checkQuantity()` enforces MOQ, pack alignment (suggesting the next valid pack) and stock clamping consistently in the product page, cart, bulk quick-order and checkout, with the same Arabic validation message everywhere.
- **Customer eligibility:** only accounts with `accountStatus: 'active'` may use wholesale ordering; pending/rejected/suspended accounts see a status banner and are blocked from the bulk-order flow. Admin can set account status and customer group per user.
- **Bulk quick-order:** search by name or SKU, enter quantities, see live tier pricing, add many items to the cart, and reorder from order history.
- **Order snapshots:** each order line stores SKU, quantity, unit price, pricing tier and currency at submit time. Later product or price-rule edits never change a submitted order. Sales price adjustments appear in the printable report as the quoted total.

## Tech

- React 19 + TypeScript + Vite 6
- React Router 7
- lucide-react icons
- CSS design tokens (no Tailwind dependency)
- localStorage persistence behind a `DataAdapter` interface

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the structure and how to swap in a real backend, and [DEPLOYMENT.md](./DEPLOYMENT.md) for going live.

## Important demo caveat

This is a **front-end demo**, not a production transactional system or ERP. Data lives in one shared cloud JSON document (plus a per-device offline cache); passwords are not secure and there is no real authentication or authorization. Deliberately absent, and **not** to be relied on:

- no real stock reservation or concurrency-safe stock decrement
- no enforceable credit limits, secure ledger or financial guarantees
- no production-grade multi-user security or audit trail
- no supplier, purchase-order or full ERP workflows

Pricing, MOQ and account-status logic are **demo/reference** behaviour for exploration, not commercial enforcement. Cloud writes use optimistic concurrency with a serialized save queue: a conflicting write is merged onto the newer remote row and retried, and a failed save is shown to the user instead of silently discarding changes — but this is best-effort, not a conflict-free data store. The production path (real backend, auth, transactions) is a separate future project; see ARCHITECTURE.md.
