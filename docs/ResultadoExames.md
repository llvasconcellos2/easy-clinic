# Exam Results Management + Exam Catalog

## Context

The patient records page (`patientRecord`) has a floating action button (FAB) offering
**Add Form / Add Prescription / Add Medical Certificate / Add Exam Request**, but there is
**no way to record the *results* of exams** a patient brings back. Doctors currently have
nowhere to log structured lab values, reference ranges, or flag altered results.

This adds two things:

1. **Exam-result entry** — a new FAB action that opens a *dedicated, separate* modal with a
   spreadsheet-style table for fast keyboard entry of exam values, with reference ranges
   auto-filled from a catalog (gender + age-aware) and live numeric validation. Saved sets
   appear in the patient timeline as a new card type.
2. **Exam Catalog CRUD** — a new collection that powers the autocomplete/reference-range
   intelligence, auto-growing as doctors enter exams, plus a full management CRUD under
   **Settings → (below Specialties)**.

Decisions: **full reference-range engine**, **full rules editor in the catalog CRUD**, **show
results in the existing timeline**, and **link results to patient + date only** (no
appointment FK).

Adapted to this app's **Meteor 1.4 + Blaze + simple-schema / collection2 / autoform +
collection-hooks + alanning:roles** stack. Collections are global (no imports), and field
naming follows existing camelCase (`patientId`, `dateOfBirth`).

---

## Part A — Collections (`src/app/lib/collections/`)

### A1. `ExamCatalog` — `lib/collections/exam-catalog.js`

Mirror the global-collection idiom of `specialties.js` and the `before.insert` hook from
`patients/patients.js`.

Schema (SimpleSchema, with i18n labels under `Meteor.isClient`):

- `name` — String, trim, max 100, indexed for search.
- `unit` — String, optional.
- `usageCount` — Number, defaultValue 0 (drives autocomplete ordering).
- `referenceRules` — `[Object]` via nested keys so autoform renders an array editor:
  - `referenceRules.$.gender` — String, allowedValues `['M','F','todos']`.
  - `referenceRules.$.ageMin` / `referenceRules.$.ageMax` — Number (in **months**), optional.
  - `referenceRules.$.min` / `referenceRules.$.max` — Number, optional (null = unbounded).
  - `referenceRules.$.displayText` — String (doctor-facing reference text).
- `before.insert`: set `createdAt`, `createdBy: userId`.
- `allow` insert/update/remove → `true` on server.
- Add a `name` index on the raw collection at startup (server) for the aggregation.

### A2. `PatientExams` — `lib/collections/patients/patient-exams.js`

Stores result sets with **reference data persisted inline** so later catalog edits never
mutate historical records.

- `patientId` — String.
- `laboratory` — String, optional.
- `datePerformed` — Date.
- `results` — `[Object]` (blackbox):
  `{ examName, value (String — supports "Positivo"), referenceUsed, unit, isAltered (Boolean) }`.
- `before.insert`: `createdAt`, `createdBy`.
- `allow` → `true` on server.

### A3. Age util — `lib/exam-age.js` (shared client+server, global fn)

`ageInMonths(dateOfBirth, referenceDate)`: `(y2-y1)*12 + (m2-m1)`, minus 1 if
`referenceDate.day < dateOfBirth.day`. Reused by both the client modal and the server
aggregation. Patient `dateOfBirth` (Date) and `gender` (`'M'`/`'F'`) come from
`_patientSchema.js`.

---

## Part B — Server (`src/app/server/`)

### B1. Publications — `publish.js`

Follow the `specialties` / `singleSpecialty` pair:

- `examCatalog` → `ExamCatalog.find()`.
- `singleExamCatalog(id)`.
- `patientExams(patientId)` → `PatientExams.find({patientId})`.

### B2. Methods — `methods.js`

Role-gate with `Roles.userIsInRole(Meteor.userId(), ['medical_doctor','super-admin'])`, else
throw `Meteor.Error` with `common_access-denied*` keys.

- **`searchExamCatalog(term, gender, ageMonths)`**: aggregation on `ExamCatalog.rawCollection()`
  (wrapped via `Meteor.wrapAsync` — Mongo 3.2 supports `$filter`): `$match` name regex,
  `$project` keep rules where `gender ∈ {patientGender,'todos'}` and
  `ageMin ≤ ageMonths ≤ ageMax` (null bounds open), `$sort usageCount:-1`, `$limit 5`.
- **`savePatientExam(patientId, doc)`**: insert the `PatientExams` document (inline reference
  data), then upsert the catalog via `bulkWrite` — per result row: `$inc usageCount`,
  `$setOnInsert name`, `$set unit`, `upsert:true`; manual references for new exams get parsed
  (B3) and `$push`ed as a `referenceRules` entry.

### B3. Manual reference parser (helper in `methods.js`)

Regex `/\d+(?:[.,]\d+)?/g`. 2 numbers → smaller=`min`, larger=`max`. 1 number → keyword scan
(`<`,`menor`,`até` → `max`; `>`,`maior`,`superior` → `min`). Produces a `referenceRules` entry
(gender `'todos'`, open age range).

### B4. Fixtures — `server/fixtures/exam-catalog.js`

Seed ~15 common exams with reference rules, guarded by `if (ExamCatalog.find().count() === 0)`.
Loaded from `server/main.js`.

---

## Part C — Exam Catalog CRUD (Settings)

Clone the **Specialties** CRUD. New folder `client/views/templates/exam-catalog/` with
`exam_catalog_list/` and `exam_catalog_form/` (each `.html`/`.js`/`.css`):

- **List**: `pageHeading` + `ibox` + `ReactiveDatatable` (name, unit, usageCount, edit link).
- **Form**: `quickForm collection="ExamCatalog"`; `referenceRules` renders as an autoform array
  field. Reuse `AutoForm.addHooks` + injected SweetAlert delete button.
- **Routes** in `imports/startup/routes.js`: `examCatalogList` (`/exam-catalog`),
  `examCatalogCreate` (`/exam-catalog/create`), `examCatalogEdit` (`/exam-catalog/:_id`).
- **Nav**: `<li>` in `navigation.html` immediately after the Specialties item, same role
  block; include `examCatalogList` in the parent `isActivePath` regexes. Icon `fa-flask`.
- **i18n**: `i18n/exam-catalog.{en,pt-BR,es}.i18n.yml`.

---

## Part D — Exam-result entry on the patient page (separate folder)

Isolated in `client/views/templates/patients/exam_results/` →
`examResultsModal.html` / `.js` / `.less`. Distinct template (not the shared `#addToRecords`).

### D1. New FAB button — `patientRecord.html`

5th dropdown button (after `#patient-add-exam-btn`) + matching empty-state `<li>`. New accent
color via custom class `btn-exam-results`, icon `fa-flask`, `id="patient-add-exam-results-btn"`,
label `patients_add-exam-results`. Include `{{> examResultsModal}}`.

### D2. Wiring — `patientRecord.js`

Handler next to the existing button clicks: open the new modal. All other logic in
`examResultsModal.js`.

### D3. `examResultsModal.js`

- Fields: Laboratory (text), Date performed (DD/MM/YYYY), results table with hidden template
  row (4 fields: name autocomplete → result → reference → unit).
- Autocomplete: keyup → `searchExamCatalog(term, gender, ageInMonths)`; custom suggestion
  dropdown (lightweight jQuery, not chosen.js).
- On select: fill reference (`displayText`) + unit, cache `min`/`max` via `data-*`, lock
  reference readonly, focus Result. No match → reference writable, focus it.
- Live validation: normalize `,`→`.`; compare cached min/max; red `#dc3545` + `isAltered=true`
  out of range, green `#198754` in range, neutral if non-numeric.
- Keyboard row growth: TAB/ENTER on Unit (last row, Name+Result filled) clones template row.
- Save: collect rows → `Meteor.call('savePatientExam', patientId, doc)`.

### D4. Timeline card — `patientTimeLine.html` + entries helper

Extend the `entries` helper to fetch `PatientExams.find({patientId})` and merge by day (add
`exams: []` bucket). New `{{#each exams}}` panel (icon `fa-flask`, accent color) with lab +
date + compact results table; `isAltered` rows highlighted red. Subscribe `patientExams` on
the patient-record route.

---

## Files at a glance

**New:** `lib/collections/exam-catalog.js`, `lib/collections/patients/patient-exams.js`,
`lib/exam-age.js`; `server/fixtures/exam-catalog.js`;
`client/views/templates/exam-catalog/exam_catalog_list/{.html,.js,.css}`,
`.../exam_catalog_form/{.html,.js,.css}`;
`client/views/templates/patients/exam_results/examResultsModal.{html,js,less}`;
`i18n/exam-catalog.{en,pt-BR,es}.i18n.yml`.

**Edited:** `server/publish.js`, `server/methods.js`, `server/main.js`,
`imports/startup/routes.js`, `client/views/common/navigation.html`,
`patientRecord.{html,js}`, `patientTimeLine.html`, `i18n/patients.{en,pt-BR,es}.i18n.yml`.

## Stack gotchas

- Mongo 3.2 supports `$filter`; aggregation/`bulkWrite` via `rawCollection()` + `wrapAsync`.
- Stay in the bundled-Babel-safe subset; add no packages; reuse chosen/datepicker/toastr/swal.
- Collections are globals — no `import`/`export` outside `imports/`.

## Verification

Docker stack already running with hot-reload (no rebuild; no new Atmosphere packages). Open
<http://localhost:3000>, log in.

1. **Catalog CRUD**: Settings shows "Exam Catalog" below Specialties → create/edit/delete an
   exam with unit + reference rule.
2. **Entry modal**: patient record page → new flask FAB → type exam name → suggestion fills
   reference+unit, focus jumps to Result → out-of-range turns red, in-range green; TAB on Unit
   spawns a new row; manual reference "até 200" on a new exam saves.
3. **Learning**: reopen Catalog → new exam exists, `usageCount` incremented, manual reference
   produced a rule with `max=200`.
4. **Timeline**: saved set appears as a flask card on the right date, altered rows highlighted;
   catalog edits afterward do not change stored historical reference text.
5. Non-doctor/non-admin cannot call `savePatientExam` (access-denied).
