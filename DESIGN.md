---
name: لُما (Luma) Cosmetics Store
description: Arabic-first, RTL wholesale cosmetics storefront and dashboards — elegant, warm, premium-but-accessible, neutral B2B tone.
colors:
  primary: "#7c1d4f"
  primary-dark: "#4a0f2b"
  primary-light: "#b83a7c"
  accent: "#c9a24a"
  rose: "#d9649a"
  rose-100: "#f9e6ef"
  canvas: "#fbf7f9"
  surface: "#ffffff"
  ink: "#241a20"
  ink-muted: "#7c7076"
  line: "#ece3e8"
  success: "#2e9e6b"
  warning: "#d98a1f"
  danger: "#d13b52"
  info: "#3d84b8"
typography:
  family: "Cairo, Tajawal, system-ui, sans-serif"
  h1: { fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.2 }
  h2: { fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, lineHeight: 1.3 }
  body: { fontSize: "15px", fontWeight: 400, lineHeight: 1.7 }
  small: { fontSize: "12px", fontWeight: 600 }
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
rounded:
  sm: 8px
  md: 14px
  lg: 20px
  xl: 28px
  full: 999px
shadows:
  sm: "0 1px 3px rgba(74,15,43,.06)"
  md: "0 8px 24px rgba(74,15,43,.09)"
  lg: "0 18px 48px rgba(74,15,43,.14)"
components:
  button-primary:
    background: "linear-gradient(135deg, #7c1d4f, #b83a7c)"
    textColor: "#ffffff"
    rounded: "14px"
    padding: "11px 20px"
  card:
    background: "#ffffff"
    border: "1px solid #ece3e8"
    rounded: "20px"
  product-card:
    hover: "translateY(-5px) + shadow-lg"
---

## Overview

Luma's visual identity is premium but approachable: deep plum as the anchor, warm gold for accents and calls to action, and soft rose tints for surfaces. It reads as a modern beauty brand rather than a generic marketplace. The direction is warm, clean and professional — generous whitespace, soft shadows, confident typography. Copy is deliberately **neutral and wholesale/B2B**: it addresses traders and shops, never a female end-consumer.

Everything is built RTL-first in Arabic. Cairo is the primary face (geometric, highly legible at small sizes); Tajawal is the fallback. Layouts use logical properties where it matters and collapse gracefully to a single column on phones.

## Colors

- **Primary plum** (`#7c1d4f`) carries brand identity: logo, nav active states, primary buttons, prices. Its darker shade (`#4a0f2b`) anchors the footer and hero gradient.
- **Gold** (`#c9a24a`) is reserved for hero CTAs and promotional bands — it signals "special", not "default".
- **Rose tints** (`#f9e6ef`, `#fdf3f8`) are surface and hover backgrounds, keeping the page warm without noise.
- **Ink** (`#241a20`) for text; muted (`#7c7076`) for secondary copy and labels.
- **Semantic colors** (success/warning/danger/info) are used only for status badges and alerts, never decoration.

Rule: plum for action and identity, gold for emphasis, rose for surface. Don't use gold on body text or plum as a large page background except the hero/footer.

## Typography

- Headings are heavy (800) with tight line-height for a confident retail feel.
- Body text is 15px / 1.7 for comfortable Arabic reading.
- Prices and stats use the heaviest weight and plum color — they are the visual payoff.
- Small labels and metadata use muted ink at 11–12px.

## Layout & Spacing

- Container max-width 1240px, centered with responsive gutters.
- A 4-column grid for stats and trust strip; product grids use `auto-fill, minmax(210px, 1fr)` and collapse to 2 columns on phones.
- Dashboards use a fixed 250px sidebar (right side in RTL) that becomes a slide-in drawer below 960px.
- Storefront has an Android-style bottom nav on phones for an app-like feel.

## Elevation & Depth

Three shadow levels: `sm` for resting cards, `md` for hover and sticky bars, `lg`/`xl` for modals and the login card. Shadows use plum-tinted rgba rather than pure black to stay in palette.

## Shapes

Rounded corners throughout: 8px inputs, 14px buttons and cards, 20px large cards, 28px hero and modals, full pills for badges. The consistent rounding is a big part of the friendly beauty-brand feel.

## Components

- **Buttons**: primary plum gradient, gold for hero, outline/ghost for secondary, danger-tinted for destructive actions. All have active scale and hover lift.
- **Product cards**: square image, badges stacked top-right, favorite heart top-left, quick-add button that slides up on hover (always visible on touch). Lift + shadow on hover.
- **Badges**: pill-shaped, semantic color per status, used for discounts, stock, order state, roles.
- **Inputs**: 1.5px border, plum focus ring, right-aligned labels in RTL.
- **Modals**: centered, blurred backdrop, sticky header, distinct footer action bar.
- **Category tree**: indented recursive rows with branch guides, collapse chevrons, depth badges and per-level reorder controls; unlimited nesting.
- **Product gallery**: thumbnail strip under the main image, active thumbnail highlight, fullscreen viewer with zoom/rotate/next-previous/share.
- **Wholesale pricing**: applied price source shown as a small badge ("سعر تفاوضي خاص" / group / default), base price struck through; MOQ/pack hints and inline validation messages in product, cart, bulk order and checkout.
- **Order reports**: white A4-style sheet with header, customer/address grid, fixed-layout items table (wrapping columns, no overflow) and total; PDF export and print buttons on customer, checkout and admin/sales report surfaces.

## Do's and Don'ts

- Do keep all user-facing copy in Arabic; English appears only as decorative brand subtext.
- Do keep copy neutral/wholesale (trader-to-shop), never directed at a female consumer.
- Do use logical spacing and RTL-aware flex direction so layouts mirror correctly.
- Do keep product images local and square for a uniform grid; products may have multiple images for the gallery.
- Do show prices in USD and label the applied wholesale pricing source.
- Don't introduce a second accent color; gold and plum are enough.
- Don't use pure black for text or shadows — the plum-tinted ink is softer and on-brand.
- Don't let dashboards drift from the storefront's visual language; they share tokens deliberately.
- Don't imply production guarantees (stock reservation, credit enforcement, secure auth) in the UI copy — this is a demo.
