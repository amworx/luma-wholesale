# لُما — متجر مستحضرات التجميل بالجملة (نسخة تجريبية)

Arabic-first **wholesale** cosmetics storefront, Android-installable PWA, sales dashboard and admin dashboard in one codebase. Prices are in **USD**; the demo context is **Syria**.

## Live demo

**https://amworx.github.io/luma-wholesale/**

Free GitHub Pages hosting, HTTPS, installable on Android. Open in Chrome → menu → "Install app" / "Add to Home screen".

## What this is

A complete **demo** for a retail cosmetics trader. One React app serves three audiences:

| Surface | Route | Who |
|---|---|---|
| Storefront | `/store` | Customers — browse, search, filter, cart, checkout |
| Sales dashboard | `/sales` | Sales team — products, variants, inventory, categories, orders |
| Admin dashboard | `/admin` | Owner — everything above plus users, analytics, settings |

The whole thing is Arabic, RTL, and free to run. Data lives in the browser (localStorage), so it works offline and on any Android device with a modern browser.

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
- Submitting generates a **printable order report** (customer + address + product lines + USD totals). The order appears in both dashboards as "new".
- The **sales team handles orders manually**: open the order report, set the final agreed price, choose the payment method, assign a salesperson, add internal notes, and update the status.
- Sales team can add/edit/delete products (full editor: images, variants, prices, stock, shipping, flags), manage inventory directly, manage categories, view/update order status.
- Admin can do all of the above plus manage users/roles, view analytics, edit store settings and announcements, and reset all data.
- Favorites and account order history per customer.
- PWA install + offline app shell via service worker.
- Routing uses **hash mode** and all asset paths are base-aware (`import.meta.env.BASE_URL`), so it works at the `/luma-wholesale/` subpath with no server rewrite rules.

## Tech

- React 19 + TypeScript + Vite 6
- React Router 7
- lucide-react icons
- CSS design tokens (no Tailwind dependency)
- localStorage persistence behind a `DataAdapter` interface

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the structure and how to swap in a real backend, and [DEPLOYMENT.md](./DEPLOYMENT.md) for going live.

## Important demo caveat

This is a **front-end demo**. Data and passwords are stored locally in the browser. There is no server, no real payments, and no real authentication. That is deliberate for a free, portable demo. The production path is documented in ARCHITECTURE.md — the UI won't need rewriting, only the data adapter and auth.
