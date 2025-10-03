# Webflow Starter (Vite)

A lightweight starter project that combines Vite with common frontend libraries used for immersive sites (GSAP, Three.js, Lenis, imagesLoaded, GLSL support). This repository is a minimal scaffold intended for building Webflow-like interactions with modern tooling.

## Quick overview

-   Vite-powered development server and build.
-   Example dependencies included: `gsap`, `three`, `lenis`, `imagesloaded`, and `vite-plugin-glsl`.
-   Small project structure to get started quickly.

## Prerequisites

-   Node.js (v16+ recommended)
-   npm or yarn

## Install

Open a terminal at the project root and run:

```bash
npm install
```

(or)

```bash
yarn
```

## Available scripts

Taken from `package.json`.

-   Start dev server (hot reload)

```bash
npm run dev
```

-   Build production bundle

```bash
npm run build
```

-   Preview the production build locally

```bash
npm run preview
```

## Project structure

```
index.html            # App entry HTML
package.json          # npm scripts and dependencies
vite.config.js        # Vite configuration
src/                  # Source files
  main.js             # App entry JS
  style.css           # Global styles
  utils/
    preloadImages.js  # small helper to preload images
```

Files you may want to edit first:

-   `src/main.js` — bootstraps your app and wires up libraries
-   `src/style.css` — global styles
-   `vite.config.js` — add plugins (e.g. `vite-plugin-glsl` is already listed as a dependency)

## Notes and tips

-   The project is intentionally minimal. Add tooling (ESLint, Prettier, TypeScript) as needed.
-   `vite-plugin-glsl` is included in `dependencies`; if you use GLSL shader imports, configure the plugin in `vite.config.js`.
-   `three` is a large dependency — consider using selective imports or CDN for very small sites.
-   `lenis` is used for smooth scroll management; pair it carefully with UI triggers and GSAP timeline controls.

## Deploy

The `build` script outputs a `dist/` folder that you can deploy to any static hosting (Netlify, Vercel, Surge, GitHub Pages, S3, etc.).

Example deploy to Surge (installed globally):

```bash
npm run build
surge ./dist example.surge.sh
```

## Troubleshooting

-   If HMR isn't working, make sure you don't have service workers intercepting requests.
-   If an imported GLSL file fails to load, confirm `vite-plugin-glsl` is configured in `vite.config.js`.
-   If `three` causes large bundles, analyze the build with `npm run build` and a bundle analyzer.

## Next steps (suggestions)

-   Add TypeScript support and types for the libraries.
-   Add simple examples demonstrating GSAP + ScrollTrigger, Three.js scene setup, and Lenis smooth scrolling.
-   Add tests, linting, and a pre-commit hook.

## License

This project does not contain a license file. Add one (for example MIT) if you plan to publish it.


