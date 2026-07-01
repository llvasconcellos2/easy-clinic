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
- **Next:** patient list (DataTables), patient form (AutoForm DOM copy + form-binder), then remaining
  CRUD pages (settings, specialties, drugs, icd10, doctors, exam-catalog, document-models, form-models).
