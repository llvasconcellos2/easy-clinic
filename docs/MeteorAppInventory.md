# Meteor / MongoDB App Inventory — Clínica Fácil

Reference inventory of the legacy **Meteor 1.4.1.3 + MongoDB 3.2 + Blaze** application, captured to
support the backendless migration (see [`NoBackendVersion.md`](NoBackendVersion.md)). Meteor project
root is `src/app/`.

---

## 1. Collections (16)

| Global var | Mongo name | Purpose |
| --- | --- | --- |
| `Patients` | `patients` | Patient demographics, contact, medical identifiers |
| `PatientRecords` | `patient-records` | Loose clinical notes/records attached to patients |
| `PatientExams` | `patient-exams` | Lab exam results (date, createdBy, blackbox results) |
| `Appointments` | `appointments` | Appointments with patient/user refs + status |
| `ImportPatients` | `importPatients` | Transient staging for bulk CSV import validation |
| `Drugs` | `drugs` | Pharmacy reference (~1.5k+ Brazilian drugs w/ HTML info) |
| `ICD10` | `icd10` | Disease classification (~14.5k ICD-10 pt-BR entries) |
| `Schedule` | `schedule` | Calendar events (availability blocks, appointments) |
| `Specialties` | `specialties` | Medical specialties (~57 pt-BR entries) |
| `ExamCatalog` | `exam-catalog` | Lab-test reference ranges (gender/age-aware) + usage stats |
| `DocumentModels` | `document-models` | Printable templates (prescription, certificate, exam request) |
| `FormModels` | `form-models` | Clinical forms (formBuilder JSON: triage, anamnesis) |
| `Settings` | `settings` | Clinic config singleton (hours, slot, value, address) |
| `Images` | `Images` | `ostrio:files` collection; **file bytes on disk** at `PWD/pictures` |
| `Meteor.users` | (accounts) | Accounts, roles, doctor profiles (CRM, specialties, workHours) |
| `Meteor.roles` | `roles` | RBAC: `default`, `medical_doctor`, `super-admin` |

Collection definitions: `src/app/lib/collections/` (patient family under
`lib/collections/patients/`). Collections are **implicit globals** (`Patients = new Mongo.Collection(...)`).

### BSON dump sizes (`db/backups/meteor-20260628-170955/`)
`drugs.bson` 2.9 MB · `icd10.bson` 25 KB · `patients.bson` 692 KB · `Images.bson` 461 KB
(metadata) · `users.bson` 12 KB · others < 10 KB.

---

## 2. Key schemas (simple-schema / collection2 / autoform)

**Patient** (`lib/collections/patients/_patientSchema.js`): `picture` (Images id), `name`*,
`records`, `dateOfBirth`*, `gender`* (M/F), `maritalStatus`, `skinColor`, `placeOfBirth`,
`literacy`, `CPF` (**unique sparse**, masked), `RG`, `titularCPF`, `fathersName`, `mothersName`,
`occupation`, `recommendedBy`, `returnDate`, `email`, `phone`/`mobile`* (masked), full address
(`zip`,`streetAddress_1/2`,`bairro`,`city`,`state`), `obs`, `createdAt` (auto). *= required.

**PatientRecords**: `date`*, `patientId`*, `recordType`, `recordName`, `record[]` (blackbox).

**PatientExams**: `patientId`*, `laboratory`, `datePerformed`*, `createdAt`/`createdBy` (auto),
`results[]` (blackbox). Writes go **only via `savePatientExam` method** (allow=false/deny=true).

**Appointments**: `patient._id/name`*, `start`*, `end`, `user._id/name`*, `status`
(re-scheduled/in_progress/completed/no_show).

**Schedule**: `resourceId`*, `constraint`*, `start`*, `end`*, `title`*, `patient`, `status`*,
`notified`. Insert checks event overlap.

**Drugs**: `name`*, `commercial_name`, `generic_name`, `special_prescription`*,
`popular_pharmacy_name`, `search`, `html` (full HTML info).

**ICD10**: `icd`* (single string, e.g. `"C00-C75-Neoplasias..."`).

**ExamCatalog**: `name`*, `unit`, `usageCount`, `createdAt/By` (auto), `referenceRules[]`
(gender `todos|M|F`, `ageMin/Max` in months, `min/max`, `displayText` like `"13,0 - 17,0 g/dL"`).

**DocumentModels / FormModels**: `name`*, `description`*, `model` (DocumentModels = HTML with
`#PLACEHOLDER` tokens; FormModels = formBuilder field-definition array), DocumentModels also `type`.

**Settings** (singleton): `workHoursStart`*, `workHoursEnd`*, `slotDuration`, `appointmentValue`,
`address`* (HTML).

**Meteor.users**: `profile{firstName,lastName,group,language,CRM,signature,picture}`, `emails[]`,
`roles[]`, `isUserEnabled`, `isSuperAdmin`, `specialties[]`, `workHours[][]` (blackbox), `createdAt`.
Direct client writes blocked (allow=false/deny=true) → mutate via `updateUser` method.

### Collection hooks (only 3, all `before.insert`)
`Patients` → set `createdAt` · `PatientExams` → set `createdAt`+`createdBy` · `ExamCatalog` → set
`createdAt`+`createdBy`+default `usageCount=0`.

### Allow/deny summary
Permissive (insert/update/remove → true): Patients, PatientRecords, Appointments, ImportPatients,
Drugs, ICD10, Specialties, Settings. Schedule insert gated (overlap). ExamCatalog role-gated.
PatientExams & Meteor.users locked (writes via methods). **Authorization mostly lives in methods**,
not allow/deny.

---

## 3. Server-side fixtures (`src/app/server/fixtures/`)

| File | Collection | Count | Notes |
| --- | --- | --- | --- |
| `specialties.js` | Specialties | ~57 | array of `{name}` |
| `users.js` | Meteor.users | 1 | default super-admin (below) |
| `roles.js` | Meteor.roles | 3 | default / medical_doctor / super-admin |
| `settings.js` | Settings | 1 | defaults below |
| `drugs.pt-BR.js` | Drugs | ~1.5k+ | 14,565 lines |
| `icd10.pt-BR.js` | ICD10 | ~14.5k | 5,748 lines |
| `form-models.js` | FormModels | 2+ | triage/anamnesis formBuilder JSON |
| `document-models.js` | DocumentModels | 5+ | HTML templates |
| `exam-catalog.js` | ExamCatalog | 100+ | reference ranges |

**Default user:** `leo.lima.web@gmail.com` / `123456`, `profile.group='medical_doctor'`,
`roles=['default','medical_doctor','super-admin']`. All fixtures insert **only if empty**.

**Default settings:** `workHoursStart 05:00`, `workHoursEnd 23:00`, `slotDuration 30`,
`appointmentValue 250`, address `"Av Rio Branco, 547 - sala 705 / Centro - Florianópolis - SC"`.

---

## 4. Server methods (`src/app/server/methods.js`, + `stats-methods.js`)

| Method | Role gate | Notes / backendless action |
| --- | --- | --- |
| `updateUser(userId,newPassword,data)` | super-admin | create/update user + roles + password + enrollment email → **port** (no hash/email) |
| `doctorSpecialtyHours(userId,data)` | super-admin | update `workHours` → **port** |
| `testPatientImport(data)` | none | validate via staging insert/remove → **port** (client validation) |
| `patientImport(data)` | none | bulk insert patients + base64 pictures → **port** (store base64) |
| `doMapReduce(patientId)` | none | Mongo mapReduce over records → **stub/drop** (JS reduce; verify usage) |
| `searchExamCatalog(term,gender,ageMonths)` | none | Mongo aggregation → **port** as JS filter |
| `savePatientExam(patientId,doc)` | medical_doctor/super-admin | insert exam + catalog learning → **port** |
| `dashboardStats` (stats-methods.js) | — | KPI aggregation → **port** as JS over local data |

Inherently server-side → **drop/stub**: `Email.send`, Movile SMS, `schedule-notifications.js`
(synced-cron every 30 min), real password hashing, email verification/enrollment.

---

## 5. Publications (`src/app/server/publish.js`, 24)

`roles` (null pub), `users`/`singleUser` (super-admin), `doctors`/`singleDoctor`
(`profile.group='medical_doctor'`), `patients`/`singlePatient`, `patientRecords`, `importPatients`,
`patient-appointments`, `appointments`, `specialties`/`singleSpecialty`,
`examCatalog`/`singleExamCatalog`, `patientExams` (role-gated), `schedule`/`patient-schedule`/
`doctor-schedule`, `settings`, `drugs`/`singleDrug`, `icd10`, `documentModels`/
`singleDocumentModel`, `formModels`/`singleFormModel`, `files.images.all`. In backendless these
become **local minimongo queries** (data preloaded from JSON).

---

## 6. Auth & roles

`alanning:roles` + `useraccounts`. Config in `imports/startup/user-accounts-config.js`:
`forbidClientAccountCreation:true`, `enforceEmailVerification:true`, `postSignUpHook` assigns
`default` + group role and sets `isUserEnabled:false`, `Accounts.validateLoginAttempt` blocks
disabled users. Email templates in `server/lib/accounts/emails.js` (verify/reset/enroll, from
`Clínica Fácil <contato@devhouse.com.br>`). Roles: `default` (all users), `medical_doctor`
(gates `savePatientExam`, `patientExams`), `super-admin` (gates `updateUser`,
`doctorSpecialtyHours`, `users` pub). Backendless → **fake local login**, roles as localStorage
flags, drop verification/hashing.

---

## 7. Files / images

`ostrio:files` `Images` collection (`lib/collections/images.js`): `storagePath = PWD/pictures`,
max 10 MB, png/jpg/jpeg. Flow: client camera/file → base64 → `Images.insert` → server writes to
disk → `Patients.addPicture` sets `patient.picture = fileRef._id` → served at `/cdn/files/Images/:id`.
**Images referenced by both `patients.picture` AND `users.profile.picture`.** Backendless → copy
disk bytes into `rip/data/images/`, rewrite `.link()` → relative path; new uploads → base64 in doc.

---

## 8. Routing (`imports/startup/routes.js`) — FlowRouter + BlazeLayout

Global guard `AccountsTemplates.ensureSignedIn` on all routes except public ones (signIn, signUp,
forgotPwd, changePwd, resetPwd, verifyEmail, enrollAccount, resendVerificationEmail, notFound,
privacy, terms-of-use). Custom "unsaved changes" route-prevention workaround at file bottom
(`Session.get('unsavedChanges')`).

| Path | Template | Subscriptions |
| --- | --- | --- |
| `/dashboard` | dashboard | schedule |
| `/schedule` | schedule | doctors, patients, schedule, settings |
| `/patients` | patientList | patients |
| `/patients/create` | patientForm | — |
| `/patients/:_id` | patientForm | files.images.all, singlePatient, formModels, documentModels, patientRecords, patientExams, settings, patient-appointments |
| `/reports/appointments` | reportAppointments | appointments |
| `/reports/patients` | reportPatients | patients |
| `/reports/production` | reportProduction | — |
| `/settings` | settingsForm | settings |
| `/specialties` `/specialties/create` `/specialties/:_id` | specialtyList / specialtyForm | specialties / singleSpecialty |
| `/exam-catalog` `…/create` `…/:_id` | examCatalogList / examCatalogForm | examCatalog / singleExamCatalog |
| `/doctors` `/doctors/:_id` | doctorList / doctorForm | doctors / specialties+singleDoctor |
| `/icd10` | icd10List | — (Ground.Collection) |
| `/drugs` `/drugs/create` `/drugs/:_id` | drugList / drugForm | — / singleDrug |
| `/users` | users | users |
| `/import` | import | importPatients |
| `/document-models` `…/create` `…/:_id` | documentModelList / documentModelForm | documentModels / singleDocumentModel |
| `/form-models` `…/create` `…/:_id` | formModelsList / formModelsForm | formModels / singleFormModel |
| `/logout` | (redirect) | — |
| `/privacy` `/terms-of-use` | privacy / terms (blankLayout) | — |

---

## 9. Frontend feature inventory (`client/views/`, ~62 files: 32 HTML + 30 JS)

Layouts: `mainLayout` (`main.html/js`: sidebar+navbar+content, `Template.dynamic`, isReady spinner,
responsive collapse), `blankLayout` (public). Global helpers in `globalHelpers.js`.

| Feature (folder under `templates/`) | Complexity | Notes / key tech |
| --- | --- | --- |
| **schedule** (~540 LOC) | VERY HIGH | FullCalendar Scheduler v4: timeline/agenda/list/month views, doctor resources, work-hour constraints, 6 status colors, Chosen modal, hardcoded "America/Sao_Paulo" |
| **patients** (6 templates) | HIGH | list (ReactiveDatatable + avatar/Gravatar), form (AutoForm, appointment start/stop, picture upload, SweetAlert delete, unsaved-changes block), record, evolution, timeline, exam_results modal |
| **import** (~350 LOC) | HIGH | Papa Parse CSV, state machine, qTip error UI, find/replace, char conversion, Session buffer |
| **form-models / document-models** | MOD-HIGH | formBuilder.js + formRender.js (drag-drop), jQuery UI sortable, preview tab |
| **users** (~300 LOC) | MOD-HIGH | Datatable, device-aware layout (side panel ↔ modal), iCheck, image upload |
| **dashboard** (~230 LOC) | MODERATE | 4 Chart.js charts off `dashboardStats`, BRL formatting, reactive i18n labels |
| **reports** (appointments/patients/production) | MODERATE | Datatables + Chart.js demographics |
| **doctors** (list/form/workHours) | MODERATE | AutoForm, work-hours grid, iCheck |
| **drugs** | LOW-MOD | Datatable + AutoForm + Summernote; offline via Ground.Collection |
| **specialties / exam-catalog** | LOW | standard CRUD list+AutoForm |
| **icd10** | LOW | read-only search; offline via Ground.Collection |
| **login / accounts-overrides** | LOW | Ladda button, prefilled demo creds, AT form overrides |

**Offline mirroring** (`client/main.js`): `Ground.Collection` mirrors `ICD10` and `Drugs` into the
browser; `stopObserver()` after 60 s.

---

## 10. Client libraries / plugins (35+)

jQuery plugins (`client/plugins/`): blueimp gallery, chosen, clockpicker, dropdown-menu-effects,
floating-action-button, **iCheck**, jquery-mobile, **jquery-ui**, **mask** (CPF/phone), metisMenu,
pace, **qtip**, slimscroll, **summernote**, **sweetalert**, toastr. Imported: bootstrap-toggle,
bootstrap-datepicker (pt-BR/es), **ladda**. Major deps: **Chart.js**, **FullCalendar Scheduler**,
**DataTables** (tabular), **formBuilder/formRender**, **Papa Parse**, Gravatar, **moment.js**,
**Ground.Collection**, **AutoForm**, Meteor.Device, **TAPi18n/T9n**, Blaze, FlowRouter, BlazeLayout,
Accounts-Templates. Local Atmosphere forks under `src/app/packages/` (datatables, camera, ground-db,
tap-i18n, meteor-fullcalendar-scheduler, profile-pic-upload, …).

---

## 11. i18n

`tap:i18n` (i18next), 48 YAML catalogs in `src/app/i18n/` per-feature × **pt-BR / en / es**
(common, dashboard, doctors, drugs, exam-catalog, exam-results, patients, schedule, specialties,
users, form-builder, patient-evolution, document-models, + schema field translations). Usage:
`TAPi18n.__('key')`, template `{{_ 'key'}}`, `T9n.get(...)`, moment locale set from current language.

---

## 12. Logic distribution

~60% template **helpers** (collection queries → datatable/chart data, formatting: dates `moment`,
BRL currency, age-from-DOB, status badges, image URL selection, edit-vs-create). ~25% **events**
(AutoForm hooks, modal/carousel flows, jQuery plugin init, import & schedule state machines,
validation UI). ~15% **server methods** (data-critical: `dashboardStats`, `patientImport`/
`testPatientImport`, `updateUser`, `savePatientExam`, appointment start/stop).
