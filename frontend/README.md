# Frontend

React + TypeScript frontend (Vite) for Multi-Store Commerce PWA.

Dev:

```
npm install
npm run dev
```

Build:

```
npm run build
```
React + TypeScript frontend (PWA)

Planned structure:
- src/
  - components/
  - pages/
  - layouts/
  - services/
  - api/
  - pwa/

Dev

- Install dependencies: npm install
- Start dev server: npm start

PWA

- `manifest.json` and service worker to be added under `src/pwa/`
PWA / installable app

The frontend is a Progressive Web App. On `localhost` it can be tested in Chrome/Edge; for public installation it must be served over HTTPS.

- Android Chrome: open the site, then browser menu → **Install app** / **Add to Home screen**.
- Desktop Chrome/Edge: use the install icon in the address bar.
- The installable app opens in standalone mode and caches visited frontend pages for basic offline access.
