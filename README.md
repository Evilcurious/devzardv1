# Devzard

A responsive, original software agency website built with React, TypeScript, Vite, and Tailwind CSS v4. It uses native SVGs, CSS motion, and Intersection Observer rather than a heavyweight animation or UI framework.

## Included

- A custom vector interpretation of the supplied Devzard mark, charcoal/cyan design system, sticky navigation, and accessible mobile menu.
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