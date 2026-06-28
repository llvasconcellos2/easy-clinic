# WEBDESIGN.md — Frontend Rules

Project-specific frontend workflow for **Clínica Fácil** (the legacy Meteor 1.4 + Blaze +
INSPINIA medical-clinic app). The design system itself lives in [`DESIGN.md`](./DESIGN.md)
(single source of truth); this file is just the *how-to-work* layer.

## Always Do First

- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no
  exceptions.
- **Read [`docs/DESIGN.md`](./DESIGN.md)** before touching styles — it is reverse-engineered
  from the real source and records the token names, the INSPINIA component patterns, and the
  `@navy`-is-green naming gotcha.

## Reference Images

- If a reference image is provided: match layout, spacing, typography, and color exactly. Do
  not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below), **within
  this project's locked legacy design system** (Bootstrap 3 + INSPINIA, not a modern stack).
- Screenshot your output, compare against the reference (or against the existing screens for
  consistency), fix mismatches, re-screenshot. Do **at least 2 comparison rounds**. Stop only
  when no visible differences remain or the user says so.

## Local Server

This app does **not** run on the host — it runs in Docker (the host lacks the pinned Meteor
1.4.1.3 dev bundle / Node 4 / native bcrypt). See [`DOCKER.md`](../DOCKER.md) and `CLAUDE.md`.

- The dev server is **plain HTTP** at **`http://localhost:3000`** — `http://`, never `https://`,
  and there is no self-signed cert to work around.
- **ALWAYS check if the stack is already running BEFORE starting it.** Run
  `curl -s http://localhost:3000/ -o /dev/null -w "%{http_code}"`. If you get an HTTP status
  (not empty / connection-refused), it's up — do **not** start another instance.
- Only if it is NOT running: start it with **`docker compose up -d`** (first build is slow —
  ~500 MB dev bundle + bcrypt compile; later runs reuse the cached volumes). Follow logs with
  `docker compose logs -f app`.
- Source under `src/app` is **bind-mounted and hot-reloads**, so edits to LESS/HTML/CSS show up
  without a rebuild. Only rebuild (`docker compose up --build`) if you touch `package.json` or
  Atmosphere packages.

### Logging in (required for almost every screen)

Every route except `/` (login), `/privacy`, and `/terms-of-use` is behind
`AccountsTemplates.ensureSignedIn`. Account creation from the client is forbidden and email
verification is enforced, so use a seeded user. To make the admin loginable (verified **and**
enabled — `validateLoginAttempt` checks `isUserEnabled`), run in the mongo shell:

```js
db.users.update({"emails.address":"leo.lima.web@gmail.com"},
                {$set:{"emails.$.verified":true,"isUserEnabled":true}})
```

Seeded admin credentials (local anonymized dump — dev only):

- **email:** `leo.lima.web@gmail.com`
- **password:** `123456`

## Screenshot Workflow

> There is **no screenshot MCP configured in this project.** Use the committed Playwright
> helper — [`src/scripts/screenshot.js`](../src/scripts/screenshot.js).

**One-time setup** (Playwright is a host-side dev tool, installed from the **repo-root**
`package.json` — kept separate from the Node-4 Meteor app in `src/app`):

```sh
npm install                       # installs playwright into ./node_modules
npx playwright install chromium   # downloads the headless browser
```

**Run it** (from **PowerShell**, not Git Bash — MSYS mangles a leading-`/` path argument,
turning `/patients` into `C:/Program Files/Git/patients`):

```powershell
# auth: export creds once, then the script logs in before capturing
$env:SCREENSHOT_USER="leo.lima.web@gmail.com"; $env:SCREENSHOT_PASS="123456"

npm run screenshot                          # /dashboard (label "dashboard")
npm run screenshot -- /patients patients    # <path> <label>
npm run screenshot -- /privacy privacy      # public page — no creds needed
```

- It launches Chromium **headless**, logs in via the useraccounts form at `/` when
  `SCREENSHOT_USER`/`SCREENSHOT_PASS` are set, then captures **two viewports** per run:
  desktop **1440×900** and mobile **390×844**, full-page.
- Output lands in **`./screenshots-dev/screenshot-<N>-<label>-<viewport>.png`** — N
  auto-increments, existing files are never overwritten, and the folder is gitignored.
- After capturing, **read the PNG back with the Read tool** — Claude can see and analyze the
  image directly.
- The browser closes when the script exits — **no manual cleanup step is needed.**
- When comparing, be specific: "ibox title is 12px but should be 14px", "card gap is 15px but
  the page uses 25px between iboxes".
- Check: spacing/padding, font size/weight/line-height, colors (exact hex against the LESS
  tokens), alignment, border-radius, shadows, image sizing.

## Design System Guardrails (this project)

The full spec is [`DESIGN.md`](./DESIGN.md). Locked rules — do not violate:

- **Pinned legacy stack.** Meteor 1.4.1.3 / Node 4 / Mongo 3.2 / Bootstrap 3 / Blaze. Do not
  upgrade packages, do not change `.meteor/release`, and do not use modern JS the bundled Babel
  can't compile (no optional chaining, no `async/await` in app code, etc.). It will break the
  Docker build.
- **No new frameworks or build tooling.** No Tailwind, no CSS custom properties, no PostCSS, no
  CSS-in-JS. Styling is **LESS** compiled through `src/app/client/stylesheets/style.less` plus
  per-template `.css` files.
- **Derive every color from the LESS tokens** in `globals/variables.import.less` — never invent
  brand colors or hard-code hexes in templates. ⚠️ Remember `@navy` is the **green** brand
  color (see DESIGN.md §2.1).
- **Build with INSPINIA components, not from scratch:** pages are `{{> pageHeading}}` +
  `.wrapper.wrapper-content` + `.ibox` (`.ibox-title` / `.ibox-content` / `.ibox-footer`).
  Reuse the existing utility classes (`.m-t-*`, `.p-*`, `.text-navy`, …) instead of inline
  styles. See DESIGN.md §4–§5.
- **Type is Open Sans**, 13px base, thin headings — the scale is fixed in
  `globals/typography.import.less` (DESIGN.md §3).
- **Icons are Font Awesome 4** (`fa-*`). Don't introduce a new icon set.
- **Globals vs. local:** cross-cutting changes go in `globals/*.import.less` or the project
  override file `stylesheets/clinica-facil.css`; one-off tweaks go in the feature's own
  `views/templates/<feature>/.../<feature>.css`. (DESIGN.md §8 maps concern → file.)
- **i18n, never hardcoded copy.** UI strings are pt-BR/en/es via `tap:i18n` — use `{{_ 'key'}}`
  in templates and `TAPi18n.__('key')` in JS, add catalog entries under `src/app/i18n/`.

## Anti-Generic Craft

Within the locked system above:

- **Respect the spacing rhythm:** iboxes sit `25px` apart, content wrappers use the
  `.wrapper-content` padding — use the named spacing utilities, never random one-off pixel
  values.
- **Interactive states matter:** every clickable element needs sensible hover/active/focus
  states. INSPINIA already supplies them for `.btn-*`, `.nav` links, and table rows
  (the `#E0F2F1` row-hover) — preserve them; don't flatten them away.
- **Motion is animate.css**, applied via classes (`animated fadeInRight` on content,
  `fadeInDown` on login). Stay consistent; don't add bespoke CSS keyframe animations.
- **Keep the dark-rail / light-canvas contrast** intact (dark `#2F4050` sidebar, `.gray-bg`
  content). Don't invert surfaces or break the two-region shell.
- **Card-first layout:** group related content into iboxes with a clear `h5` title (+ optional
  `<small>` subtitle); don't dump bare content into the wrapper.
