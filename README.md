# Devzard

A responsive, original software agency website built with React, TypeScript, Vite, and Tailwind CSS v4. It uses native SVGs, CSS motion, and Intersection Observer rather than a heavyweight animation or UI framework.

## Included

- A custom vector interpretation of the supplied Devzard mark, charcoal/cyan design system, sticky navigation, and accessible mobile menu.
- A scroll-driven hero story: the product separates into its interface, frame, circuit board, processing core and chassis as you scroll, then reassembles, with four synced text chapters.
- An interactive Alwazir demonstration with five workspace views, search, date-range changes, order filters, order detail dialogs, and CSV exports.
- Five service detail dialogs with animated interface illustrations and project inquiry handoffs.
- A data-driven Work section featuring DeepHQ and linking directly to its live website. The existing Alwazir demo and case study are retained but are not featured.
- An interactive six-step process, technology section, about section, and project inquiry form.
- Documentation, downloadable brief template, three engineering notes, FAQs, privacy notice, terms, and a not-found page.
- Page metadata, canonical URLs, Open Graph and X sharing metadata, JSON-LD, sitemap, robots.txt, SVG favicon, and custom sharing artwork.
- Keyboard focus styles, native modal focus trapping, reduced-motion support, and responsive layouts.

## Project Structure

- `src/App.tsx`: application entry point, page routing, and inquiry handoff state.
- `src/components/`: modular homepage sections, shared UI, and interactive workspace.
- `src/components/HeroPixel.tsx`: the homepage hero — copy, chapters, stage readout, progress rail.
- `src/components/pixelScene.ts`: the pixel-art artwork and the layout/camera maths for it.
- `src/pages/`: Alwazir case study, resource pages, and not-found page.
- `src/data/site.ts`: deployment settings, services, projects, process, FAQs, and illustrative dashboard data.
- `src/lib/`: navigation, downloads, and page metadata.
- `src/styles/`: design tokens, components, pages, and responsive styles.
- `public/images/`: custom editorial image and social sharing artwork.

## Before Publishing

1. Verify `SITE_URL` in `src/data/site.ts` before publishing. The official contact details are `devzardpk@gmail.com` and `+92 317 4541414`; the shared constants supply the email and telephone links throughout the site.
2. Keep the domain in `index.html`, `public/sitemap.xml`, and `public/robots.txt` synchronized with the published domain.
3. Add official URLs to `SOCIAL_PROFILES` in `src/data/site.ts`. Unconfigured profiles open an honest contact dialog rather than linking to an unrelated account.
4. Confirm the project copy, media permissions, and legal notices with the business. Product photography and dashboard records are illustrative; no client revenue figures, testimonials, or performance results are asserted.
5. The DeepHQ project references the live site at https://www.deephq.online. The featured card opens that website directly; the existing case study also contains a cross-origin iframe preview. Confirm client consent to feature and embed the site. Preview figures are reproduced from the site's content, not independently verified business results.
6. Configure your hosting provider to serve `index.html` for application routes. A `_redirects` fallback is included for hosts that support that convention.
7. Run browser, mobile-device, keyboard, screen-reader, and email-client checks against the deployed domain. The production build is verified, but browser automation is not available in this environment.

## Architecture

```
Public site (/)  ─┐                        ┌─► Neon PostgreSQL (content, admin, sessions, audit, media metadata)
                  ├─► Express API (server/) ┤
Admin (/admin)   ─┘                        └─► Vercel Blob (image binaries)
```

- `server/` holds the API. Content, admin users, sessions, the audit log, and media metadata live in Neon PostgreSQL via `DATABASE_URL`.
- Image binaries go to Vercel Blob via `BLOB_READ_WRITE_TOKEN`; only the Blob URL and metadata are stored in the database. The browser receives resolved URLs and never the token.
- If `DATABASE_URL` / `BLOB_READ_WRITE_TOKEN` are absent (local dev), the server falls back to `server/data/` (git-ignored). Production should always set them.
- All four secrets are server-only. None are prefixed with `VITE_`, so they cannot enter the client bundle.

## Environment variables

Copy `.env.example` to `.env` and set `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `SESSION_SECRET`. `.env` is git-ignored. On a hosting provider, set the same variables in the dashboard — no source edits are needed to move between local, preview, and production.

- Schema/migrations run automatically on boot (`getStorage().init()`), creating tables if they do not exist.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` seed the first admin on boot if none exists. They are read server-side only and stored as a bcrypt hash; they are never returned by any API.

## Run

- Dev: `npm run dev` (the API is mounted into Vite).
- Prod: `npm run build` then `npm start` (Express serves `dist/` and the API; `/admin` refreshes return `index.html`).

## Hero display

`src/components/HeroPixel.tsx` (art in `pixelScene.ts`) is the first thing on the homepage: a pixel-art display that comes apart as you scroll.

- **Style.** Everything on the canvas is pixel art on an integer grid — no image assets, no anti-aliased curves. The scene lives in a small design space (the panel is 104 × 62 units) and a camera fits it to the canvas, so one set of numbers works from a phone to a 4K monitor. Type inside the artwork is drawn with a 5 × 7 bitmap font defined in `pixelScene.ts`; it is skipped automatically when a font pixel would be smaller than 1.4 device pixels.
- **First frame.** The assembled monitor beside the site's hero copy: brand, headline, description, both calls to action. The screen is the studio's menu — software development, hosting, ERP, AI automation and design — with the marker stepping down the list on the ambient clock.
- **One service per plate.** Each of the five plates the machine separates into carries one service, named by the annotation beside it (software development, hosting, ERP systems, AI automation, video and graphic design). The name is also etched into the plate itself, so the label and the part always agree. The mapping lives in `SERVICES` in `HeroPixel.tsx`; the plates live in `PARTS` in `pixelScene.ts`.
- **On scroll.** The section is a tall track (`320vh`) with a sticky, viewport-sized stage inside it. One value, `explodeAt(progress)`, opens the machine between 8% and 38%, holds it open through the three chapters, and closes it again between 66% and 92% so the closing line lands on an assembled device. Parts come off in order: front glass → diffuser sheet → control board → power board → chassis, with the stand leaving the desk last. They all move on the same clock, so the stack can never pass through itself.
- **Chapters.** Three chapters (services, work, process) plus a closing call to action, cross-faded in the left column, each with its own scroll window. Annotations with leader lines appear beside the separated parts on wide screens; the top readout tracks the stage (`STAGE 01 · DISASSEMBLING`), and the rail fills with progress.
- **Measurements.** `pixelLayout(width, height, explode, stacked)` returns the camera and every part's box in CSS pixels. The canvas paints from it and so do the annotation labels, which is why a label always sits on the part it names.
- **No overflow.** Every decorative layer is absolutely positioned inside an `overflow: hidden` stage. There is no fixed overlay, no cursor follower, no negative offset and no element that can escape the page box. The scroll track uses `overflow-x: clip`, which contains the decoration without turning the section into a scroll container (that would break `position: sticky`).
- **Performance.** Scroll never touches React state. One rAF-batched pass reads the scroll position and writes to the canvas and the overlays directly (`style.transform`, `style.opacity`, `textContent`). The canvas is only repainted when the explosion actually moves, plus a 90 ms ambient tick for the drifting dust, the screen sweep and the pointer parallax; the tick pauses when the tab is hidden or the stage is off screen.
- **Layout.** Split (copy left, machine right) at 900 px and up; `data-layout="stacked"` puts the copy in the top band and the machine underneath. The attribute is set from the measured stage width, so CSS and the canvas always agree.
- **Reduced motion.** `prefers-reduced-motion: reduce` renders one still frame of the assembled panel, keeps the hero copy, and turns the chapters into ordinary sections below it. The pointer parallax is disabled.
- A reload always starts at the hero: `scrollRestoration` is `manual` and any `#hash` left in the URL by an earlier in-page click is dropped at boot. In-app hash links (Contact, Start a Project) still scroll as before.

## The stack

`src/components/StackStory.tsx` (art in `stackScene.ts`) sits directly below the hero: one system, four layers, centred on the page.

- **Frontend, backend, database, security.** The drawing is four pixel plates stacked in that order. Closed, they read as one machine; as you scroll they separate, and a request packet keeps travelling down through them and back up.
- **Chapters.** Four chapters (one per layer) cross-fade underneath the drawing; the plate the current chapter describes gets a cyan keyline and a live marker, its label in the margin goes full brightness, and the rail on the right lights the matching number. Rail buttons are real `<button>`s that scroll to their chapter.
- **Motion.** Same engine as the hero: one rAF-batched pass reads the scroll position and writes to the canvas and the overlays directly, and the canvas only repaints when the separation actually moves (plus a 90 ms ambient tick that pauses when the tab is hidden or the stage is off screen).
- **Labels.** The names beside the drawing are DOM text positioned from the same layout maths the canvas uses, so they stay crisp at any scale and always sit on the plate they name. They flip to the left side of a plate when the right edge is too close, and are hidden on narrow screens where the chapter text already names the layer.
- **Content.** Everything in the panels is illustrative and true to the stack we use — PostgreSQL, Node/Spring, React, role-based permissions — not invented metrics.
- **Reduced motion.** One still frame of the separated stack plus the four chapters as ordinary sections.
- **No overflow.** Every layer is inside an `overflow: hidden` stage; the track uses `overflow-x: clip`.

## Deploy

The website and its admin API are deployed on Vercel (project `devzardv1`).

- Production URL: https://devzardv1.vercel.app — admin at `/admin`
- `vercel.json` pins the framework preset, `npm ci` / `npm run build`, and the `dist` output directory. It also adds an SPA rewrite, so deep links such as `/privacy`, `/work/deephq`, and `/admin` resolve to `index.html` instead of 404ing, plus baseline security headers and long-lived caching for `/images/*`.
- The front end is a static bundle: `vite-plugin-singlefile` inlines the JS and CSS into `index.html`, and everything in `public/` is copied to the output root.
- The API runs as one Node function, `api/index.js`. `vercel.json` rewrites `/api/*` to it while keeping the original URL, so the Express app from `server/app.ts` sees the same paths it handles in development. It initialises storage, seeds the first admin, and resolves the session secret once per warm instance.
- `api/index.js` is generated: `server/entry.ts` is bundled with esbuild by `scripts/build-api.mjs`, because Vercel's Node runtime executes the entry as native ESM and does not transpile the TypeScript modules it imports. Vercel only creates functions for files that exist in the commit, so the bundle is committed. Run `npm run build:api` after changing anything under `server/` — `npm run build` does it for you.
- Content, sessions, the audit log and media metadata live in Neon PostgreSQL (`DATABASE_URL`, connected through the Vercel Neon integration).

### Environment variables

Set on the Vercel project for both Production and Preview:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon connection string, supplied by the Neon integration |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeds the first admin on the first request if none exists |
| `SESSION_SECRET` | 32+ characters; signs and ages admin sessions |
| `BLOB_READ_WRITE_TOKEN` | Optional. Needed for image uploads; without it uploads fail on a read-only serverless filesystem |

`ADMIN_PASSWORD` must be at least 12 characters. Both admin variables are read server-side only and the password is stored as a bcrypt hash — never in source, never returned by an API.

`POST /api/admin/setup` creates the admin when none exists. With `ADMIN_EMAIL` / `ADMIN_PASSWORD` set, the seed runs on the first request and closes that path; do not deploy the API without them.

Uploads are the one feature that needs `BLOB_READ_WRITE_TOKEN`. Everything else — signing in, editing content, reviewing the audit log — works without it.

`npm start` still runs the whole app locally on one port (Express serving `dist/` plus the API).

Note that `SITE_URL` in `src/data/site.ts`, the canonical and Open Graph tags in `index.html`, and `public/sitemap.xml` / `public/robots.txt` still reference `https://devzard.com`. Update them to the production domain before promoting the site for search.

## Admin security

Visit `/admin`. The public site and admin UI are separate routes. Admin mutations go through `/api/admin/*` and are rejected without a server session.

- Passwords hashed with bcrypt server-side; never in React source or plaintext.
- HttpOnly `SameSite=Strict` session cookies, idle expiry, CSRF tokens on every write, logout invalidates the session server-side.
- Login rate-limited with generic "Invalid credentials"; repeated failures lock temporarily.
- Zod validation on every admin payload; parameterized SQL only; http(s)-only external URLs.
- Uploads validated by magic-byte sniffing, size cap, and server-generated filenames; stored in Blob, not the DB or bundle.
- Admin actions are written to an audit log (no secrets recorded).
- Two-factor authentication is not implemented; the session model can accept TOTP later without replacing login.

DeepHQ remains the shipped featured Work project. Alwazir is not in the public seed.

## Inquiry Delivery

There is intentionally no simulated server submission. The form validates the inquiry and prepares an email draft. The visitor reviews and sends it using their email app. They can also copy or download the brief.

No form data is stored in browser storage or sent to an API. If direct delivery is needed, connect a real server endpoint and an approved email provider, add rate limiting and spam protection, and update the privacy notice. Do not change the confirmation to say "sent" until the server has confirmed delivery acceptance.

## Extending the Site

Services and portfolio entries are data-driven. Add a project to `projects` in `src/data/site.ts` and set `featured: true` to display it in Work. Set `featured: false` to keep its data without displaying it. Supply an approved visual and either an `externalUrl` to open the live site or a corresponding case study route and metadata entry.

The source uses native browser history for navigation. Route metadata is updated client-side; the initial HTML contains complete homepage metadata. If unique social previews are required for each route, add prerendering or server-rendered metadata at deployment.

Media sources are documented in `public/media-credits.txt`.