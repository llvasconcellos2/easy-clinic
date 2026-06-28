# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Clínica Fácil** ("Easy Clinic") — a medical-clinic management system for patients,
appointments/scheduling, doctors, prescriptions and clinical records. It is a **legacy
Meteor 1.4.1.3 + MongoDB 3.2 + Blaze** app (circa 2016) that has been archived and made
to run again under Docker. The original repo lived on Bitbucket; only `first commit` exists
in this git history. UI language is primarily Brazilian Portuguese (pt-BR), with en/es i18n.

The Meteor application lives entirely under **`src/app/`** — that is the Meteor project root
(it contains `.meteor/`). Everything outside `src/app/` (Docker files, `scripts/`, `db/`) is
tooling added to revive the app.

## Running the app

The supported path is Docker — do not try to `meteor run` on the host (it needs the pinned
1.4.1.3 dev bundle, Node 4, and a native `bcrypt` build).

```sh
docker compose up --build        # build + start mongo, seed, and the Meteor app
docker compose up -d             # background
docker compose logs -f app       # follow Meteor server logs
docker compose down              # stop (keeps data + caches)
docker compose down -v           # also wipe mongo-data, build cache, node_modules volumes
```

Then open <http://localhost:3000>. **First build is slow** (~500 MB Meteor dev bundle +
bcrypt compile); later runs reuse the `meteor-local` and `app-node-modules` volumes.

Source is bind-mounted (`./src/app` → `/src/app`), so edits hot-reload. `node_modules` and
`.meteor/local` are **named volumes** layered over the bind mount to preserve the
image-compiled bcrypt and the build cache — if you change `package.json` or Atmosphere
packages, rebuild the image (`docker compose up --build`) or the volume will shadow stale deps.

See `DOCKER.md` for the full stack description.

### Logging in

Account creation from the client is forbidden (`forbidClientAccountCreation`) and email
verification is enforced. Seeded users come from the anonymized dump. To verify the admin
so you can log in (from `scripts/README.md`):

```js
db.users.update({"emails.address":"leo.lima.web@gmail.com"},{$set:{"emails.$.verified":true}})
```

## Database & seed data

- `db/meteor/` is a **cleaned + anonymized** BSON dump. The `seed` service in
  docker-compose restores it into the `meteor` DB **only if empty** (idempotent).
- `scripts/` are one-off **mongo-shell** maintenance scripts (plus `03-fix-images.sh`, a
  bash/ImageMagick orchestration) used to dedupe CPFs, backfill valid Brazilian CPFs,
  repair patient images, and anonymize PII. Run in numeric order against the running stack;
  see `scripts/README.md`. They mutate the `mongo-data` volume, so `down -v` reverts to the
  original dump and they must be re-run.

## Architecture

Standard Meteor 1.4 directory-based load order inside `src/app/`:

- **`lib/`** — runs on **both** client and server, loaded first. Collection definitions
  (`lib/collections/`) live here so they exist everywhere: `Patients`, `PatientRecords`,
  `Encounters`, `ImportPatients` (under `lib/collections/patients/`), plus `Drugs`, `ICD10`,
  `Schedule`, `Settings`, `Specialties`, `DocumentModels`, `FormModels`, `Images`, and
  `Meteor.users` extensions (`users.js`). Collections are **global variables** (no imports) —
  e.g. `Patients = new Mongo.Collection('patients')`.
- **`client/`** — Blaze. `client/views/` holds `layouts/` (`mainLayout`, `blankLayout`),
  `pages/`, and `templates/<feature>/` (one folder per domain: patients, schedule, doctors,
  drugs, icd10, document-models, form-models, reports, settings, users, import, login...).
  `client/plugins/` and `client/stylesheets/` carry vendored jQuery/Bootstrap UI plugins.
- **`server/`** — `main.js`, `methods.js` (Meteor methods), `publish.js` (publications),
  `schedule-notifications.js` (cron job), and `fixtures/` (seed data: drugs, ICD-10,
  specialties, users).
- **`imports/startup/`** — explicitly imported from `client/main.js` and `server/main.js`:
  `routes.js` (client routing), `i18n-setup.js`, `user-accounts-config.js`. This is the only
  part using ES module `import`; most of the app relies on Meteor's implicit global loading.

### Routing

Client-side **FlowRouter** + **BlazeLayout**, defined in `imports/startup/routes.js`. Each
route registers its Meteor subscriptions and renders a content template into `mainLayout`
(or `blankLayout` for public pages: login, privacy, terms, notFound). A global
`FlowRouter.triggers.enter([AccountsTemplates.ensureSignedIn])` guards all routes except the
auth/public ones. There is also a custom "unsaved changes" route-prevention workaround at the
bottom of the file (uses `Session.get('unsavedChanges')`).

### Data flow

Classic Meteor pub/sub: collections in `lib/` → `Meteor.publish` in `server/publish.js` →
`Meteor.subscribe` registered per-route → reactive Blaze templates. Schemas are enforced with
**aldeed:simple-schema / collection2 / autoform** (`Patients.attachSchema(...)`; patient
schema in `lib/collections/patients/_patientSchema.js`). `matb33:collection-hooks` provides
`before.insert` hooks. Note: `Patients.allow(...)` currently returns `true` for all
insert/update/remove — client-side writes are effectively open; **authorization mostly lives
in Meteor methods**, not allow/deny rules.

### Auth & roles

`alanning:roles` + `useraccounts`. Roles include `super-admin`, `default`, and profile groups
like `medical_doctor`. Privileged operations (creating/updating users, doctor hours) are
gated inside `server/methods.js` with `Roles.userIsInRole(..., 'super-admin')`. The
`'doctors'` publication is just users with `profile.group === 'medical_doctor'`.

### Other moving parts

- **Offline/persistent client collections**: `ground:db` mirrors `ICD10` and `Drugs` into
  the browser (`Ground.Collection`) in `client/main.js` so large reference lists stay local.
- **Scheduled notifications**: `percolate:synced-cron` job in `server/schedule-notifications.js`
  runs every 30 min, finds upcoming `Schedule` events and notifies patients by **email**
  (`Email.send`) and **SMS** (Movile API — credentials are scrubbed/`***REMOVED***`). Started
  via `SyncedCron.start()` in `server/main.js`.
- **i18n**: `tap:i18n` with YAML/JSON catalogs in `src/app/i18n/` (per-feature, per-locale)
  and `lib/i18n/*.js`. Use `TAPi18n.__('key')` in code.
- **File uploads**: `ostrio:files` (`Images` collection) + local `profile-pic-upload` and
  `mdg:camera` packages for patient photos. `Patients.addPicture` writes a base64 buffer.
- **Local Atmosphere packages**: `src/app/packages/` vendors forked/patched packages
  (`datatables`, `camera`, `ground-db`, `tap-i18n`, `meteor-fullcalendar-scheduler`, etc.).
  Edit these in place rather than expecting them on Atmosphere.
- **Mobile**: originally a Cordova/Android build (`mobile-config.js`, README build steps).
  The Docker image builds `--server-only`; there is no Android SDK in the container.

## Frontend & web design

For any UI / styling / web-design task, follow the dedicated docs:

- **[`docs/WEBDESIGN.md`](docs/WEBDESIGN.md)** — the *how-to-work* layer: invoke the
  `frontend-design` skill first, run the stack on `http://localhost:3000`, and use the
  Playwright screenshot helper (`scripts/screenshot.js`, run via `npm run screenshot`) to
  capture and compare your output.
- **[`docs/DESIGN.md`](docs/DESIGN.md)** — the design-system single source of truth: color
  tokens, typography, layout, and the INSPINIA component patterns (`ibox`, `pageHeading`),
  reverse-engineered from `src/app/client/stylesheets/`. Read it before touching styles.

The UI is **Bootstrap 3 + the INSPINIA theme**, styled in **LESS** under
`src/app/client/stylesheets/` (compiled via `style.less`) plus per-template `.css` files.
Stay within those tokens and components — do not introduce a new CSS framework.

The repo-root `package.json` exists only for **host-side dev tooling** (Playwright); it is
**not** the Meteor app (that is `src/app/package.json`, pinned to Node 4 and built in Docker).

## Conventions specific to this codebase

- **No build/lint/test tooling** — there are no tests, no linter, no `npm` scripts beyond a
  `postinstall` that copies font-awesome fonts. "Build" means the Meteor bundler. Don't add a
  framework expecting CI; verify changes by running the stack and exercising the UI.
- Collections and many helpers are **implicit globals**; match that style in `lib/`,
  `client/`, `server/` rather than introducing `import`/`export` outside `imports/`.
- This is a **pinned legacy stack (Meteor 1.4.1.3 / Node 4 / Mongo 3.2)**. Do not upgrade
  package versions, use modern JS APIs unsupported by the bundled Babel, or change
  `.meteor/release` — it will break the Docker build. Keep changes within the existing idioms.
- Commit messages / PRs are not yet established here (single squashed initial commit).
