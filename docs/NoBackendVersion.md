# backendless migration - SPA / PWA - Only Static Files - jQuery

I need to generate a full working version of the meteor / mongodb system but "exported" to plain html, css and javascript with jquery.
I want to make a version that works completely without backend. The app will be hosted on a cdn and the fixtures will be json that will be stored locally on the browser.

> **This document is the living build plan.** It is updated as the work progresses.

---

## Context

The app is a legacy **Meteor 1.4.1.3 + MongoDB 3.2 + Blaze** clinic system that only runs under
Docker with a pinned Node-4 dev bundle. The goal is to **demo it without putting the outdated
backend online** — and, ideally, ship it as a **free, fully backendless single-user web app** on a
CDN. Target: plain static files (HTML/CSS/JS + jQuery) in a new top-level **`rip/`** folder, with
all MongoDB collections exported to **JSON fixtures** the browser downloads and loads locally.

### Decisions locked with the user
- **Scope:** port as much as possible; single-user app; **no tech-stack upgrades**; reuse every
  library at its **current project version**; only add code that **replaces/emulates backend
  behavior**.
- **Auth:** fake local login — the login page is a splash screen; clicking *Sign in* sets a
  hardcoded current user (the seeded doctor `leo.lima.web@gmail.com`) and routes to `/dashboard`.
  Role checks become client-side flags. No real security.
- **Persistence:** **pluggable** — a synchronous in-memory store ships first (perfect demo); add an
  **IndexedDB write-through adapter** (localForage/Dexie, era-appropriate, script-include) as an
  opt-in *persisted mode* for the free-app version. **No RxDB** (async/RxJS + bundler + schema
  friction; redundant behind the synchronous store).
- **Renderer / overall approach:** **"rip & rewire"** — the app is a **frozen mirror**, so
  AutoForm/FlowRouter/Blaze are build-time conveniences we don't need. Capture the **already-rendered
  DOM** from `http://localhost:3000` and drive it with **plain jQuery + a tiny shim**. Runtime-harvest
  (boot real Blaze headless) and a Handlebars rewrite are kept only as documented fallbacks.

---

## Architecture — Plan A (primary): "rip & rewire" with Handlebars + per-template classification

The app is **frozen** — we mirror it, we don't extend it. So the heavy Meteor machinery
(AutoForm, FlowRouter, Blaze reactivity, minimongo, DDP) is **build-time scaffolding**. We keep the
**Spacebars template structure as Handlebars** (so data stays bound, *not* hardcoded) and re-drive
everything with plain jQuery + a tiny shim. **No headless Meteor boot.**

### Per-template classification — the core method (do this for every template)
**Read the template's `.js` first, then its `.html`,** and sort every piece into one of three
buckets:

1. **jQuery-plugin region** — spotted in the `.js` as `$("#id").plugin(opts)`. The plugin is
   self-contained and renders itself from options. → Provide an **empty container** + **reuse the
   existing init code as-is**. **Never copy the plugin's rendered DOM.** (FullCalendar, DataTables,
   Summernote, Chosen, iCheck, jquery.mask, bootstrap-datepicker, formBuilder/formRender, qTip.)
   *Worked example — schedule:* the whole calendar is `var calendar = $("#calendar").fullCalendar({…})`
   in `schedule.js`; rip needs only `<div id="calendar"></div>` + that init. Same for the
   `#patients-table` DataTable, the Summernote drug editor, the Chosen patient select.

2. **AutoForm-generated DOM** — `{{> quickForm}}`, `{{> afQuickField}}`, `{{#autoForm}}`. We are not
   reimplementing AutoForm's schema→form generation, so **copy the rendered form nodes from
   `http://localhost:3000`** into the template as static markup, then wire submit via `form-binder.js`
   (read inputs → doc → store). Inputs already carry `name` = schema key.

3. **Structural Spacebars** — `{{> partial}}`, `{{#if}}`, `{{#each}}`, `{{_ 'key'}}`, `{{pathFor}}`,
   `{{#if currentUser}}`. → **Keep as Handlebars** with the same partial structure and **bind data**
   (current user, collections, i18n) so nothing is hardcoded.
   *Worked examples:* `navigation` (avatar = `Meteor.user()` gravatar + `#side-menu` metisMenu init),
   `topNavbar` (waiting-patients bell from `Schedule.find({status:'waiting'})`, lang-switch, logout),
   `footer` (i18n string) — all stay partials bound to a fake `currentUser`/store.

> The earlier "snapshot whole pages" idea was wrong: it froze plugin output and hardcoded data.
> Classification fixes both — we rip **only** AutoForm DOM, keep structure in Handlebars, and let
> plugins rebuild themselves.

**What we reuse verbatim** (already plain jQuery): plugin inits, DataTables column defs + render fns
(e.g. `patient_list.js`), modal builders, most event handlers.

**The only Meteor APIs the existing client JS touches → tiny shim** (no framework boot):

| Meteor API used in client JS | rip/ shim |
| --- | --- |
| `Collection.find().fetch()` / `findOne` / `insert/update/remove` | synchronous **in-memory store** (minimongo-lite) over the JSON data, with a change event |
| `Template.X.helpers/events/onRendered/onCreated` | a ~30-line `Template` registry: render page template, bind `events` via jQuery delegation, run `onRendered` |
| `FlowRouter` (`route`, `go`, `path`, params) | a small hash/History router mapping paths → page templates |
| `Meteor.subscribe('x')` | no-op returning `{ready:()=>true}` (data preloaded) |
| `Meteor.call(method,…)` | dispatch to local method impls (see §3) |
| `Meteor.user()/userId()` + `Roles.userIsInRole` | fake current user (seeded doctor) + role flags |
| AutoForm submit / validation | generic **form ↔ object** binder (read inputs → doc → store); light/manual validation |
| `TAPi18n.__` / `{{_ 'key'}}` | pt-BR demo uses baked-in text; optional small JSON dict if en/es needed |
| `Images.link()` / `/cdn/files/...` | relative path under `rip/data/images/` |
| `Email.send` / Movile SMS cron | **dropped** (optional browser Notification stub) |

**Cost/benefit:** more hand-written jQuery than runtime-harvest, but every piece is simple,
debuggable, pixel-faithful, and free of framework-boot mystery. Truest to "plain jQuery."

### Fallback (documented only, not the plan)
- **A2 — runtime-harvest:** extract the compiled Meteor client bundle (Blaze + Spacebars templates +
  minimongo + AutoForm + FlowRouter) and disable only DDP via `__meteor_runtime_config__`; load JSON
  into minimongo instead of subscribing. Zero template work **if** the bundle boots without a server
  — that "if" is the risk. Only if the Handlebars approach stalls badly.

---

## Proposed `rip/` layout
```
rip/
  index.html                 # app shell (captured layout/nav) + script/css includes in load order
  vendor/                    # copied as-is from the project: jQuery + all plugins, DataTables,
                             # FullCalendar, Chart.js, Summernote, moment, Papa Parse, INSPINIA CSS...
  pages/                     # captured rendered page templates (1 per route) — shell + repeat unit
    patientList.html  patientForm.html  schedule.html  dashboard.html  drugList.html ...
  shim/
    store.js                 # synchronous in-memory minimongo-lite (find/findOne/insert/update/remove + change events)
    template.js              # Template registry: render page, bind events, run onRendered
    router.js                # FlowRouter-compatible hash/History router
    data-source.js           # fetch rip/data/*.json -> revive EJSON dates/ids -> load into store
    methods.js               # local impls of the server methods (see §3); Meteor.call dispatch
    auth.js                  # fake login, Meteor.user/userId, Roles.userIsInRole
    files.js                 # Images.link()/imgPath -> relative data/images path
    form-binder.js           # generic AutoForm replacement: form <-> object, light validation
    persistence.js           # in-memory default + pluggable IndexedDB(localForage) write-through
  app/                       # the existing client JS reused (column defs, plugin inits, handlers)
  data/
    patients.json drugs.json icd10.json appointments.json schedule.json
    specialties.json exam-catalog.json document-models.json form-models.json
    settings.json users.json roles.json patient-records.json patient-exams.json Images.json
    images/<id>.(jpg|png)    # actual picture bytes copied from server /pictures
  assets/                    # avatar.jpg, fonts, favicons
  manifest.json  sw.js       # PWA (later phase)
```

---

## Workstreams

### 0. Living doc + data export
- Keep this `docs/NoBackendVersion.md` updated as the build progresses.
- **Export collections → JSON.** Run `mongoexport --jsonArray` against the running Docker mongo for
  every collection into `rip/data/*.json` (a small loop script under `src/scripts/`). Collections:
  `patients, patient-records, patient-exams, appointments, schedule, drugs, icd10, specialties,
  exam-catalog, document-models, form-models, settings, users, roles, Images`. The exported data is
  the **anonymized + demo-tagged** dataset (incl. the ~20 `_demo:true` patients).
- **Copy image bytes.** Pull the server `/pictures` dir out of the container into
  `rip/data/images/`; record the id→file mapping for the `.link()` rewrite.
- Loader (`data-source.js`) must **revive Extended-JSON** (`{"$date":...}`, `{"$oid":...}`) into
  real `Date`/string `_id` before inserting, so `moment()` and date inputs keep working.

### 1. Templates (Handlebars) + vendor copy — per the classification above
- **Convert each Spacebars `.html` → a Handlebars template/partial** under `rip/pages/`
  (`{{> partial}}` → Handlebars partial, `{{_ 'k'}}`/`{{pathFor}}`/`{{eventsCount}}` → registered
  helpers, `{{#each}}`/`{{#if}}` unchanged). Keep the partial structure so data stays bound.
- **jQuery-plugin regions:** replace the plugin's markup with an **empty container** and rely on the
  reused init (e.g. `<div id="calendar">`, `<table id="patients-table">`). Don't convert their output.
- **AutoForm regions (`quickForm`/`afQuickField`):** copy the **rendered form DOM** from
  `http://localhost:3000` into the template as static markup; wire submit via `form-binder.js`.
- **Copy vendor assets as-is** into `rip/vendor/` (jQuery + all `client/plugins/`, DataTables,
  FullCalendar Scheduler, Chart.js, Summernote, moment, Papa Parse, bootstrap-datepicker, iCheck,
  mask, Chosen, **Handlebars**, …) plus the merged **INSPINIA CSS** (already saved as `styles.css`).
  No version changes.
- **Already done:** `rip/index.html` (mainLayout inlined), `navigation` inlined as `<nav>`,
  `styles.css` from `merged-stylesheets.css`. **Next:** make `navigation`/`topNavbar`/`footer`
  data-bound Handlebars partials (un-hardcode the user/avatar) and stand up the dashboard.

### 2. Shim foundation
- `store.js`: synchronous minimongo-lite — `find(selector).fetch()`, `findOne`, `insert/update/
  remove`, plus a change emitter the Template registry subscribes to for re-render. Selector subset
  used by the app (equality, `$in`, `$regex`, sort/limit).
- `template.js`: `Template.<name> = { helpers, events, onCreated, onRendered, onDestroyed }`
  registry; `render(name)` injects `pages/<name>.html`, runs helpers to fill the repeat unit, binds
  `events` via jQuery delegation, calls `onRendered`. Coarse re-render on store change.
- `router.js`: FlowRouter-compatible (`route/group/go/path/getParam`, `triggers`); hash or History;
  preserves the unsaved-changes guard.
- `auth.js`: hardcoded current user = seeded doctor; `Meteor.userId/user`, `Roles.userIsInRole`,
  `ensureSignedIn` pass-through; login button → set user + go `dashboard`; logout → splash.
- `files.js`: `Images.findOne(id).link()` → `data/images/<id>...`; keep Gravatar fallback.
- `form-binder.js`: AutoForm replacement — serialize a captured form to a doc (names = schema keys),
  hydrate a form from a doc, light required/format checks, submit → store + method.
- `persistence.js`: in-memory by default; adapter `{hydrate(), persist(coll, op, doc)}` with a
  localForage/Dexie IndexedDB impl behind a `?persist=1` / settings flag. First-run seeds from JSON;
  later runs hydrate from IndexedDB; **Reset-to-fixtures** action + seed **version** key.

### 3. Local method implementations (`30-methods.js`)
Port the cataloged server methods to client-side equivalents over minimongo:

| Method | Action in rip/ |
| --- | --- |
| `updateUser` | local user upsert + role array set; **no** password hash / email (single-user) |
| `doctorSpecialtyHours` | update `users.workHours` doc locally |
| `testPatientImport` / `patientImport` | validate vs simple-schema client-side; insert patients; store picture base64 directly |
| `savePatientExam` | insert PatientExam; bump `ExamCatalog.usageCount` + reference-rule learning locally |
| `searchExamCatalog` | replace Mongo aggregation with JS filter (regex + gender/age) over local catalog |
| `doMapReduce` | JS reduce over local PatientRecords (or drop if unused — verify call sites) |
| `dashboardStats` (`stats-methods.js`) | compute KPI aggregates in JS over local collections |

- `Meteor.call` shim dispatches to these; methods that sent email/SMS are dropped.

### 4. Feature bring-up — work backwards from the dashboard (verify each route vs the original)
Start where the **full app frame** already lives; do login last (it's just a splash).
1. **Dashboard FIRST** — carries `mainLayout` + nav + topNavbar + footer; Chart.js (vendored) off a
   local `dashboardStats`. Getting this up proves the shell, router, store, and Handlebars partials.
2. **Reference/CRUD (low):** settings, specialties, exam-catalog, drugs (Summernote), icd10 + drugs
   lists (read local store), doctors.
3. **Patients:** list (DataTables, reuse column defs), form (copied AutoForm markup + form-binder +
   picture upload→base64), records, exams, evolution, timeline.
4. **Reports:** Chart.js + DataTables.
5. **Schedule (hardest):** empty `<div id="calendar">` + reuse `schedule.js` `$("#calendar").fullCalendar({…})`
   init; feed events/resources from local collections; appointment start/stop writes locally; drop notified-cron.
6. **Login LAST:** splash screen; *Sign in* sets the hardcoded doctor and routes to `/dashboard`.
5. **Builders + import:** form/document-model builders (formBuilder/formRender), CSV import
   (Papa Parse) wired to local `patientImport`.

### 5. PWA / free-app polish (after core works)
- `manifest.json` + `sw.js` (cache app shell + `data/`), enable IndexedDB persisted mode,
  `navigator.storage.persist()`, Reset-to-fixtures UI, offline check.

---

## Key risks
- **Per-page rewire volume** — the cost moves from one scary boot to many small jQuery glue jobs.
  Bounded and linear (routes are inventoried), but it's the bulk of the work.
- **Snapshot parameterization** — must strip baked-in data and re-bind from JSON; dynamic selects
  (specialty dropdowns, etc.) need repopulation. Per-list manual work.
- **Schedule (FullCalendar Scheduler)** — the one inherently complex page, regardless of approach.
- **Storage size:** drugs (~2.9 MB) + patients + base64 images — fine for IndexedDB, **not** for
  localStorage; that's why the adapter targets IndexedDB.
- **Image references** are shared by `patients.picture` **and** `users.profile.picture` — copy/map
  both.
- **EJSON revival** of dates/ids on load — required or date handling breaks.
- Capture depends on the **running Docker stack** at `localhost:3000`; vendor assets are era-pinned
  (don't upgrade).

---

## Verification
- Run the **original** stack at `http://localhost:3000` as the behavioral reference (already running;
  login `leo.lima.web@gmail.com` / `123456`).
- Serve `rip/` as static files (e.g. a simple static server) and exercise each route; compare
  against the original. Use the Playwright screenshot helper (`npm run screenshot`,
  `src/scripts/screenshot.js`) to diff pages.
- Per feature: load → list renders from JSON → create/edit persists (in-memory, then IndexedDB mode)
  → reload keeps edits in persisted mode / resets in demo mode.
- Confirm no network calls to the dead backend (DevTools network tab) and no console-fatal errors.

---

## Open items to confirm during build
- Whether `doMapReduce` is still called anywhere (drop if dead).
- Exact `pictures/` extraction path from the container and id→filename mapping.
- Whether en/es i18n is needed for v1, or pt-BR baked-in text is enough.
- Confirm Playwright can reach every authenticated route for capture (login state in the script).

---

## Progress log
- **Started (by user):** `rip/index.html` scaffolded with `mainLayout` inlined; `{{> navigation}}`
  replaced by the rendered `<nav>` DOM (note: user/avatar currently hardcoded — to be re-bound via
  Handlebars); `merged-stylesheets.css` saved as `rip/styles.css`. Static server running on
  `http://localhost:8081` (`python -m http.server 8081`).
- **App frame DONE** (verified headless at `:8081`, zero console errors): vendored jQuery 1.11.2,
  Bootstrap 3.3.6, metisMenu 2.5.2, Handlebars 4.0.5 into `rip/vendor/`; converted all pt-BR i18n
  catalogs → `rip/data/i18n/pt-BR.json` (322 keys); built `rip/shim/shim.js` (fake
  `Meteor.user`/`Roles`/`TAPi18n`, `Gravatar` via bundled md5, helpers `_`/`pathFor`/`isActivePath`/
  `isInRole`/`eventsCount`/`langActive`, a Spacebars→Handlebars `{{#if helper args}}` preprocessor,
  and the render harness); `navigation`/`topNavbar`/`footer`/`loading` are faithful Handlebars
  partials in `rip/templates/`, all **data-bound** (name/avatar/group from the fake doctor, gravatar
  hash matches the original). `index.html` restructured: layout in a `<script type=...handlebars>`,
  `#app` mount, vendor+shim includes. Copied `public/images`, `public/fonts` (FA), `public/patterns`
  into `rip/`. Verifier: `src/scripts/verify-rip.js` (Playwright; checks DOM + console + screenshot).
- **Store + router + data pipeline DONE** (verified headless, zero errors):
  - `rip/shim/store.js` — synchronous minimongo-lite: `find(sel).fetch()/.count()`, `findOne`,
    `insert/update/upsert/remove`, EJSON revival (`{"$date":…}` → Date), selector operators
    (`$in/$nin/$gt/$gte/$lt/$lte/$ne/$regex/$exists/$or`), sort/skip/limit, change events.
    Exposes Meteor global collection names (`Patients`, `Appointments`, etc.) as Store instances.
  - `rip/shim/data-source.js` — fetches all 14 `rip/data/*.json` files in parallel, loads into Store,
    fires `Store.onReady()` when complete. Stubs `Meteor.subscribe` (no-op) and `Meteor.call`
    (dispatches to `Meteor._methods` registry).
  - `rip/shim/methods.js` — local JS impl of `dashboardStats` and `productionStats` (port of
    `server/stats-methods.js`) computing KPI aggregates + Chart.js data over local Store.
  - `rip/shim/router.js` — hash-based router; matches `#/route/:id` → template name → fetches
    `rip/templates/content-<name>.hbs`, compiles + renders into `<div id="page-content">`;
    `FlowRouter` surface (`go/path/getParam/getQueryParam/current`); `Router.navigate/onRoute/setUnsaved`.
  - All 14 MongoDB collections exported to `rip/data/*.json` via `mongoexport --jsonArray` from Docker
    mongo: 1300 appts, 100 patients, 6832 patient-records, 638 drugs, 289 ICD-10, 125 exam-catalog,
    54 specialties, 8 doc-models, 3 form-models, 789 patient-exams, 15 schedule, 10 users, 1 settings,
    109 image-meta docs.
  - `rip/templates/content-dashboard.hbs` — real dashboard: 5 KPI cards, today's agenda timeline,
    4 Chart.js charts (appts/month bar, records-by-type doughnut, age-groups bar, gender doughnut).
  - `rip/templates/pageHeading.hbs` — shared breadcrumb heading partial.
  - Vendored `Chart.min.js` + `moment-with-locales.min.js` into `rip/vendor/`.
  - `index.html` updated: dashboard CSS inlined, correct script load order
    (store → data-source → methods → shim → router).
  - Playwright check confirms: zero errors, frame intact, `contentText` = "Pacientes 100 Total cadastrado"
    (live from JSON data). Charts render via Chart.js in the screenshot.
- **All primary routes DONE** (templates + JS inits wired in `_afterRender`):
  - Patient list (DataTables + Gravatar), patient create/edit forms (form-binder + datepicker + file upload preview).
  - Patient records tab: `cd-horizontal-timeline` port; FAB with 5 sub-buttons + mini-tutorial empty state.
  - Patient evolution tab: 4 Chart.js line charts (IMC, weight, BP, heart rate) + optional exam results chart.
  - All reference/CRUD lists: drugs, ICD-10, specialties, doctors, exam-catalog, document-models, form-models (DataTables).
  - CRUD create/edit forms for **all 6 sub-route pairs** (added 2026-07-01):
    - Specialty: single-field form, insert/update/delete + toastr feedback.
    - Exam catalog: name/unit + dynamic reference-rules rows (add/remove), insert/update/delete.
    - Drug: all schema fields + **Summernote** rich-text editor on `html` field; vendored `summernote 0.8.1` from Docker package cache.
    - Doctor: Summernote signature editor, Chosen multi-select specialties + color, 7-day **workHours grid** with clockpicker time slots (add/remove per day).
    - Document model: Summernote model editor + Chosen type select + placeholder help text.
    - Form model: **formBuilder** drag-drop builder + formRender preview tab; vendored `form-builder.js/css` + `form-render.js/css` from `src/app/client/plugins/formBuilder/`.
  - Vendored into `rip/vendor/`: `summernote.js/css`, `sweetalert.min.js/css`, `clockpicker.js/css`, `form-builder.js/css`, `form-render.js/css`, `papaparse.js`.
  - Settings form: fills from `Settings.findOne()`, saves back to store.
  - Reports (appointments/patients/production): DataTables + Chart.js demographic charts.
  - Schedule: FullCalendar Scheduler timeline + appointment create/edit modal + doctor resources.
  - Users: DataTable + inline edit panel (create/update user, group/role selection).
  - **Import**: rewritten with PapaParse CSV flow — file upload → parse + validate required fields → preview table → confirm → `Patients.insert` per row.
  - Logout: 2-second delay showing "Saindo…" then fade to login splash.
- **CSS asset audit + router template bug fixed** (2026-07-01):
  - Surveyed every `url()` reference in `styles.css` and all `rip/vendor/*.css` files.
  - Critical assets confirmed present: `chosen-sprite.png` + `@2x` in both `rip/vendor/` (for `chosen.css`) and `rip/` (for `styles.css`); `green.png` + `@2x` in `rip/` (iCheck); Summernote fonts in `rip/vendor/font/` and `rip/packages/summernote_summernote/dist/font/`.
  - Remaining 404s are non-critical: `img/video-play.png` etc. (blueimp Gallery — not used), `images/animated-overlay.gif` (jQuery UI progressbar — not used), `images/ui-bg_*.png` (jQuery UI theming — overridden by Bootstrap/INSPINIA). These won't affect the visible clinic UI.
  - **Router bug fixed**: create/edit form routes (`specialtyCreate`, `examCatalogCreate`, `drugCreate`, `drugEdit`, `doctorEdit`, `documentModelCreate`, `documentModelEdit`, `formModelsCreate`, `formModelsEdit`) were looking for `content-<routeName>.hbs` but the shared templates are named `content-<resource>Form.hbs`. Fixed by adding a `template` override field to ROUTES entries and updating `matchRoute`/`renderContent` to use it. The route name is preserved for `_afterRender` dispatch.
  - Added missing i18n key `document-models_description` → `"Descrição"` to `pt-BR.json`.
  - Summernote `lang: "pt-BR"` falls back silently to English toolbar labels (locale not bundled in vendored JS) — cosmetic only, editor is functional.
- **PWA + IndexedDB persistence DONE** (2026-07-01):
  - `rip/manifest.json` — standard PWA web-app manifest (`name`, `short_name`, `start_url`, `display: standalone`, `theme_color: #1ab394`, `background_color: #f3f3f4`, SVG icon reference).
  - `rip/sw.js` — cache-first service worker; precaches all app-shell files (index.html, styles.css, vendor/*, shim/*, templates/*.hbs, data/*.json, data/i18n/pt-BR.json, fonts, sprites); cache busted by `CACHE_NAME` version string; cross-origin requests (Gravatar) bypass the cache.
  - `rip/shim/persistence.js` — IndexedDB adapter:
    - **In-memory mode** (default): no-op; app behaves as before.
    - **Persist mode** (`?persist=1` once, or Settings page toggle): on first visit seeds IDB from JSON fixtures; on subsequent visits loads from IDB (mutations survive reload); Store.onChange → debounced write-through (300 ms); `navigator.storage.persist()` called to prevent browser eviction; seed version key (`SEED_VERSION = "1"`) — bump to force a reseed wipe.
    - `Persistence.reset()` — clears all IDB stores + reloads (re-seeds from JSON).
    - `Persistence.enable()` / `Persistence.disable()` — toggle mode + reload.
- **Full browser verification + 6 defects fixed** (2026-07-02). Playwright sweep of all 27 routes +
  15 interaction flows (new scripts `src/scripts/verify-rip-routes.js`, `verify-rip-flows.js`,
  `check-rip-data.js`). Defects found and fixed:
  1. **Store string-selector bug (critical)**: `update`/`remove`/`find` didn't normalize string ids and
     `matchSelector` matched everything for non-object selectors → editing one doc renamed **all** docs,
     deleting one **wiped the collection**. Fixed in `store.js` (`if (typeof sel === "string") sel = {_id: sel}`).
  2. **Fake user id mismatch**: `currentUser._id` was `"doctor-leo"` but all data keys off the real
     seeded doctor `QTWAByLcNDWsZLDzN` → dashboard agenda could never match. Fixed in `shim.js`.
  3. **New schedule events stored string dates**: calendar `select` inserted `start.format()`; the
     original relied on SimpleSchema autoConvert. String-vs-Date `$gte` compares as NaN → new
     appointments never appeared on the dashboard (the user-reported bug, together with #2).
     Fixed: `start.toDate()`/`end.toDate()`.
  4. **Orphan schedule→patient refs** (broken in Mongo itself by the anonymization scripts): repaired
     via new `src/scripts/12-fix-schedule-refs.js` + fresh `src/scripts/export-rip-data.sh` re-export.
  5. **formBuilder dead** (`$sortableFields.sortable is not a function`): jQuery UI was never vendored.
     Copied `jquery-ui.min.js/css` from `src/app/client/plugins/jquery-ui/` into `rip/vendor/`,
     included before `form-builder.js`, added to SW precache.
  6. **Stale fixture dates**: added `demoRefresh()` in `data-source.js` — shifts all time-series
     collections forward by a uniform whole-day delta (newest schedule event = today) and fills
     today's calendar to ~80% of every doctor's work-hour slots (`_demo: true` events). Runs each
     demo-mode load; in persist mode only at JSON seed. `SEED_VERSION` bumped to "2" (v1 IDB data may
     be corrupted by defect #1) and SW `CACHE_NAME` to v2.
  - `rip/shim/data-source.js` — one-line change: calls `Persistence.afterLoad(fire)` instead of `fire()` directly, so IDB hydration completes before `Store.onReady` fires.
  - `rip/index.html` — added `<link rel="manifest">`, `theme-color` meta, `persistence.js` in load order (before `data-source.js`), and SW registration snippet after `router.js`.
  - `rip/templates/content-settingsForm.hbs` — added "Modo de dados" ibox panel: shows active/demo status alert; buttons to enable/disable persist mode; in persist mode, a SweetAlert-confirmed "Restaurar dados originais" button that calls `Persistence.reset()`.

---

## Current state — verified working (2026-07-02)

The full build was browser-verified with Playwright (route sweep + interaction flows) and all
defects found were fixed the same day (see progress log). Current status:

- **All 27 routes render** with data, zero console/page errors, zero inline error boxes.
- **All interaction flows pass**: specialty CRUD (create/prefill/update/delete affect exactly one
  doc), schedule modal + status transitions, users edit panel, CSV import preview, patient create,
  deep-linking a hash before login, `?persist=1` seeding.
- **The user-reported bug is fixed and covered by a regression test**: creating an appointment on
  the schedule for the logged-in doctor today now appears on the dashboard agenda.
- Demo freshness is automatic: `data-source.js` `demoRefresh()` shifts all fixture dates forward at
  load so the newest schedule event lands on today, then fills today's calendar to ~80% of every
  doctor's work-hour slots (generated events tagged `_demo: true`).

### Verification tooling (run with the static server on :8081)

- `node src/scripts/check-rip-data.js` — fixture referential integrity + date freshness.
- `node src/scripts/verify-rip-routes.js` — render sweep of every route.
- `node src/scripts/verify-rip-flows.js` — interaction/regression flows (15 checks).
- `sh src/scripts/export-rip-data.sh` — re-export all 14 collections from Docker mongo (run
  `src/scripts/12-fix-schedule-refs.js` first if patients were re-anonymized).

### Remaining polish (optional)

- Summernote pt-BR locale not bundled — toolbar labels fall back to English (cosmetic).
- Import confirm step inserts patients (parse+preview verified; final insert exercised only manually).
- PNG icon assets (192×192, 512×512) for better PWA install-banner support on Android.

---

## Technical handoff — key facts for the next session

### How the router works now (after 2026-07-01 fix)

`rip/shim/router.js` — ROUTES entries can have an optional `template` field. If present, that file name is used for the `.hbs` load; the route `name` is always used for `_afterRender` dispatch and `FlowRouter.current()`.

```js
// example
{ path: "specialties/create", name: "specialtyCreate", template: "specialtyForm" }
// loads: rip/templates/content-specialtyForm.hbs
// fires: _afterRender("specialtyCreate", {}, {})
```

`renderContent(templateName, routeName, params, query)` — 4-arg signature. `navigate()` calls it as `renderContent(matched.template, matched.name, matched.params, query)`.

All CRUD create/edit form pairs share a single `.hbs` template (named `content-<resource>Form.hbs`). The JS init reads `FlowRouter.getParam('id')` to distinguish create vs. edit mode. Patients are the exception — they keep separate `content-patientCreate.hbs` / `content-patientEdit.hbs`.

### Verification method

Start the static server (`python -m http.server 8081` from `rip/`) and open `http://localhost:8081`. Login is fake — click *Entrar* (pre-filled `leo.lima.web@gmail.com` / `123456`). Navigate via the sidebar or by typing hash URLs directly.

To diff against the real app, start Docker (`docker compose up -d`) and compare at `http://localhost:3000`.

### Known gotchas

- **Summernote pt-BR locale**: not bundled in `rip/vendor/summernote.js`. `lang: "pt-BR"` silently falls back to English toolbar labels. The editor is functional; labels are just in English.
- **formBuilder instance**: `$.fn.formBuilder()` returns the jQuery collection (`.each()` return). To get the formBuilder instance, use `$(el).data('formBuilder')` — this is what the code does. `formBuilder.actions.getData()` returns the field array; `formBuilder.formData` is the JSON string.
- **Doctor form is edit-only**: no `doctorCreate` route — doctors are created via the Users form (`#/users`). `initDoctorForm(id)` redirects to `doctorList` immediately if called with no id.
- **Chosen + set value order**: set native `<select>` value first (before Chosen init), then call `.chosen()`. Chosen reads the initial selected state during init. After init, use `.trigger("chosen:updated")` if you change the value programmatically.
- **iCheck images** (`green.png`, `green@2x.png`): must be at `rip/green.png` (relative to `styles.css`). These are already in place.
- **Summernote fonts**: needed at two paths — `rip/vendor/font/summernote.*` (for `vendor/summernote.css`) and `rip/packages/summernote_summernote/dist/font/summernote.*` (for `styles.css` Meteor-style path). Both already copied.
- **`preprocess()` in shim.js**: converts `{{#if helper arg}}` → `{{#if (helper arg)}}` so Handlebars 4's subexpression syntax is satisfied. Also strips `{{>` partials that aren't registered (silently drops unknown partials).

### File map — what lives where

| Concern | File |
| --- | --- |
| Route table + FlowRouter surface | `rip/shim/router.js` |
| All page init functions (`initDrugForm`, etc.) | `rip/shim/shim.js` |
| In-memory store (collections) | `rip/shim/store.js` |
| Data load from JSON files | `rip/shim/data-source.js` |
| Local method impls (`dashboardStats`, etc.) | `rip/shim/methods.js` |
| i18n dictionary (pt-BR) | `rip/data/i18n/pt-BR.json` |
| Handlebars page templates | `rip/templates/content-*.hbs` |
| Shared partials (nav, topNavbar, footer, etc.) | `rip/templates/*.hbs` (non-content) |
| Vendor JS/CSS | `rip/vendor/` |
| Summernote fonts | `rip/vendor/font/` + `rip/packages/summernote_summernote/dist/font/` |
| Chosen + iCheck sprites | `rip/vendor/chosen-sprite*.png`, `rip/green*.png`, `rip/chosen-sprite*.png` |
