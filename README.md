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
- `src/components/DevzardScrollExperience.tsx`: hero scroll story (pinned canvas, chapters, chapter rail).
- `src/components/deviceScene.ts`: the device artwork, drawn as vector layers on the canvas.
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

## Scroll experience

`src/components/DevzardScrollExperience.tsx` renders the homepage section directly below the hero (`#story`).

- The section is a tall track (`380vh` desktop, shorter on mobile). A sticky, viewport-sized stage is pinned inside it, and a single passive `scroll` listener maps the track's progress to a canvas frame.
- Scroll work is batched into one `requestAnimationFrame` per frame. Captions, the chapter rail, and the canvas are written to directly (`style.setProperty` / `classList`), never through React state, so scrolling does not re-render or repaint more than once per frame.
- The device artwork lives in `deviceScene.ts` and is drawn as vector layers, so it stays sharp at every size and needs no network requests. The canvas keeps a transparent background and fits the artwork inside its own box (`contain`), so it blends into the page section without edges.
- Chapters are defined in one place: the `CHAPTERS` array (scroll position, alignment, title, copy, optional CTA). The first chapter is clamped on at the top of the track and the last at the end, so the opening and closing lines stay readable instead of fading into the section edges.

### Using a pre-rendered image sequence instead

The scene also supports a raster sequence. To swap it in:

1. Render zero-padded frames (WebP or AVIF) at a consistent size and framing, e.g. `frame_0001.webp`, `frame_0002.webp`, … Put them in `public/images/devzard-sequence/`.
2. Edit `SEQUENCE` at the top of `DevzardScrollExperience.tsx`:

   ```ts
   export const SEQUENCE = {
     enabled: true,
     directory: '/images/devzard-sequence',
     pattern: 'frame_',
     extension: 'webp',
     pad: 4,
     frames: 60,                       // number of frames you actually added
     fallbackImage: '/images/devzard-social.jpg',
   } as const;
   ```

3. Keep `pad` equal to the number of digits in the filenames. `frames` is the only place the frame count lives — nothing else assumes a length.

Frames are preloaded before scroll-driven animation starts; until then the vector scene keeps rendering, so the section never shows an empty box, and a failed sequence falls back automatically. Each frame is drawn `contain`-style at the available aspect ratio, so mixed sizes do not crop.

### Motion and accessibility

- `prefers-reduced-motion: reduce` replaces the pinned story with a static, fully readable version: one still frame of the product plus the same four chapters as ordinary content. Hero parallax is also disabled.
- The hero gets a small, rAF-batched parallax on the product mockup (desktop only, max 46px) and a "scroll inside the build" cue that links to `#story`.
- The pinned stage exposes a hidden `<h2>` and description for screen readers; the canvas itself is `aria-hidden`. Chapter buttons in the rail are real `<button>`s that scroll to their chapter.

## Deploy

The website and its admin API are deployed on Vercel (project `devzardv1`).

- Production URL: https://devzardv1.vercel.app — admin at `/admin`
- `vercel.json` pins the framework preset, `npm ci` / `npm run build`, and the `dist` output directory. It also adds an SPA rewrite, so deep links such as `/privacy`, `/work/deephq`, and `/admin` resolve to `index.html` instead of 404ing, plus baseline security headers and long-lived caching for `/images/*`.
- The front end is a static bundle: `vite-plugin-singlefile` inlines the JS and CSS into `index.html`, and everything in `public/` is copied to the output root.
- The API runs as one Node function, `api/[...path].ts`, which mounts the Express app from `server/app.ts` for every `/api/*` request. It initialises storage, seeds the first admin, and resolves the session secret once per warm instance.
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