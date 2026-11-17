# Deployment

The build output is a plain static site in `dist/`. Host it anywhere; attach a domain when the client signs off.

## Current live deployment

- **URL:** https://amworx.github.io/luma-wholesale/
- **Host:** GitHub Pages (free, HTTPS), repo `amworx/luma-wholesale`, branch `gh-pages`
- **Base path:** `/luma-wholesale/` (set in `vite.config.ts`)
- **Routing:** hash mode (`HashRouter`) — no server rewrite rules needed

### Redeploy after changes

```bash
npm run build
$env:GH_TOKEN = gh auth token
$tok = $env:GH_TOKEN
npx gh-pages -d dist -b gh-pages -r "https://x-access-token:$tok@github.com/amworx/luma-wholesale.git" -m "Deploy update"
```

GitHub Pages rebuilds in ~30 seconds. Verify at the URL above.

### Moving to a domain root later

Set `base: '/'` in `vite.config.ts`, set `start_url`/`scope` and icon paths to `/` in `public/manifest.webmanifest`, then rebuild. Hash routing keeps working unchanged.

## 1. Build

```bash
npm install
npm run build
```

Output: `dist/` (HTML, CSS, JS, manifest, service worker, icons, images).

## 2. Test the production build locally

```bash
npm run preview
```

Open the printed URL. The service worker only registers in production builds, so this is how you verify install/offline behaviour locally.

## 3. Deploy to a free host (demo)

Any of these work with zero server config:

- **Netlify** — drag `dist/` onto netlify.com/drop, or connect the repo with build command `npm run build`, publish dir `dist`.
- **Vercel** — `vercel --prod`, framework preset "Vite".
- **Cloudflare Pages** — connect repo, build `npm run build`, output `dist`.
- **GitHub Pages** — push `dist/` with a Pages action. Note: if hosting under a subpath (e.g. `user.github.io/repo/`), set `base` in `vite.config.ts` to `/repo/` and prefix the asset paths accordingly — see the note below.

All give you a free HTTPS URL, which is required for PWA install on Android.

## 4. Going live with a domain

1. Point the domain's DNS at your host (A/CNAME records per the host's instructions).
2. Enable HTTPS (all hosts above do it free via Let's Encrypt).
3. Update `public/manifest.webmanifest` (`name`, `start_url`, `scope`) and `index.html` metadata if the store name/branding changes.
4. Replace the placeholder contact details in the admin settings screen (or in `src/data/seed.ts` for fresh installs).
5. Rebuild and redeploy.

### Subpath hosting caveat

The app currently uses `base: '/'` and root-absolute asset paths (`/images/...`, `/sw.js`), which is correct for a domain root. If you must host under a subpath, set `base: '/subpath/'` in `vite.config.ts` and change the leading `/` on asset paths in `index.html`, `manifest.webmanifest`, `sw.js`, `src/main.tsx` and `src/data/seed.ts` to `/subpath/`. Domain-root hosting needs none of this.

## 5. Android install

Once hosted over HTTPS:

1. Open the site in Chrome on the Android device.
2. Chrome menu → "Install app" / "Add to Home screen".
3. It opens full-screen with an icon, offline-capable — indistinguishable from a native app for this use case.

## 6. Before real production

The demo stores data and passwords in the browser. For a real store you must add a backend (database, real auth, payments, image uploads). The frontend is built to swap its data layer without rewrites — see [ARCHITECTURE.md](./ARCHITECTURE.md). Nothing in the UI needs to change when that day comes.
