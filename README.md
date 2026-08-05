# Kevin Wu — CV site

A responsive web version of `CV.pdf`, plus a portfolio with screens from the real systems.
Next.js 16 (App Router) + React 19 + Tailwind CSS v4, English / 繁體中文, dark & light themes.

## Run it

```bash
npm install
npm run assets     # one-off: builds the portfolio images (see below)
npm run dev        # http://localhost:3000
```

`npm run build` type-checks and produces the production build; `npm start` serves it.

## Pages

| Route | What it is |
| --- | --- |
| `/[locale]` | The CV: hero, about, work-experience timeline, skills, education |
| `/[locale]/portfolio` | Project cards |
| `/[locale]/portfolio/[slug]` | Case study: highlights, tech stack, links, screenshot gallery with lightbox |
| `/api/cv?locale=en\|zh-HK` | The whole CV as JSON |
| `/api/cv/download` | The original PDF, as a download |

Locales are `en` (default) and `zh-HK`, negotiated in `src/proxy.ts` (Next 16's renamed
middleware) by `next-intl`.

## Where the content lives

- `src/data/cv.ts` — structure only: dates, tech stacks, image paths, links.
- `messages/en.json`, `messages/zh-HK.json` — every piece of prose, keyed to the ids in `cv.ts`.

Adding a job or project means editing both: the entry in `cv.ts`, and its text in each
`messages/*.json`.

## Portfolio images

Both generators are idempotent (they skip files that already exist; pass `--force` to redo).

- `npm run assets:pdf` renders pages 3–9 of `CV.pdf` into `public/portfolio/*.jpg` and copies
  the PDF to `public/cv/`. macOS ships no poppler, so it drives the built-in PDFKit through
  JXA rather than adding a rasteriser dependency.
- `npm run assets:schedule` captures `../schedule_project` — the multi-tenant course platform —
  at desktop and mobile viewports into `public/portfolio/schedule/`. It reuses that repo's
  existing E2E harness (dedicated `schedule_app_e2e` database, API on 4100, Vite on 5273) so
  it never touches the dev database, and it modifies nothing inside that project. **PostgreSQL
  must be running.**

## Scroll-worlds

Each case study opens with a short scroll-scrubbed film, and `/portfolio` opens with one about
how the work gets made. They are not screen recordings: every scene is broken into 140 discrete
states, screenshotted one at a time, and encoded with a very short GOP, so scrubbing by scroll
position lands on an exact frame with no seek stutter.

- `scenes/manifest.mjs` is the single list of scenes. `src/data/world.ts` is its front-end twin:
  which deck plays where, how much scroll each scene gets, and how the clip time is eased.
- Two kinds of scene. **`explainer`** is a self-contained `scenes/<id>.html` that renders as a
  pure function of `window.__setFrame(i, total)` — no CSS animation, no timers, no randomness,
  or the frames would not be reproducible. **`app`** boots a real product from `APPS` and pans
  down it.
- Shared look lives in `scenes/scene.css`. Its portrait block is a different art direction, not
  the desktop board shrunk: a phone frame only leaves the top ~55% visible once the translated
  copy and its scrim take the lower half.
- `npm run assets:world` captures then encodes; both halves take `--force` and `--only=id,id`.
  Explainers need only Playwright and ffmpeg; `schedule-tour` also needs PostgreSQL.

Adding a scene means: the HTML in `scenes/`, an entry in `scenes/manifest.mjs`, an entry in
`src/data/world.ts`, and `eyebrow` / `title` / `body` under `portfolio.world.scenes.<id>` in
**both** `messages/*.json`.

## Checking a change

With `npm run dev` running:

- `npm run check:world` drives the schedule case study past a browser and reports whether each
  clip actually scrubs, whether the stage is fully dissolved before the sticky container lets
  go, and whether the content below is clickable. Pass a URL and `mobile` for other cases.
- `npm run shot -- .shots/x.png http://localhost:3000/en/portfolio mobile` for a single frame.

## Deploying

`NEXT_PUBLIC_SITE_URL` sets the origin used by `metadataBase`, `sitemap.xml`, `robots.txt` and
the OG image. On Vercel it falls back to `VERCEL_PROJECT_PRODUCTION_URL`, so a first deploy is
already correct; set the variable once a real domain is attached.

`public/world/` and `public/portfolio/` must stay in version control — no CI runs the capture
scripts, and `schedule-tour` could not run there anyway.
