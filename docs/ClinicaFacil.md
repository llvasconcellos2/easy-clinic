## MIGRATION ANALYSIS: Meteor 1.4 → Backendless SPA/PWA

I've completed a thorough catalog of all server-side logic in the "Clínica Fácil" Meteor app. Here's the structured summary:

### 1. METEOR METHODS INVENTORY (server/methods.js)

**File:** `c:\Users\leona\Projects\easy-clinic\src\app\server\methods.js`

| Method                 | Purpose                                      | Inputs                                                           | Auth/Roles                        | Database Ops                                                                                     | Port/Drop/Stub        | Notes                                                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------- | ---------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `updateUser`           | Create or update user + password + roles     | `userId` (string), `newPassword` (string), `data` (object)       | `super-admin` only (gates access) | Meteor.users insert/update, Roles assignment, Accounts.setPassword, Accounts.sendEnrollmentEmail | **PORT**              | Critical: server-side auth validation. In backendless, roles become fake/stored in localStorage; password hashing impossible (stub to fake hash or reject password changes). Email sending must be dropped or faked.   |
| `doctorSpecialtyHours` | Update doctor's schedule/availability        | `userId` (string), `data` (object with specialty hours)          | `super-admin` only                | Meteor.users update                                                                              | **PORT**              | Simple data update; can be ported as direct data mutation client-side. Role gate becomes localStorage check.                                                                                                           |
| `testPatientImport`    | Validate patient CSV/array before import     | `data` (array of patient objects)                                | None (public)                     | ImportPatients insert/remove (temporary staging)                                                 | **PORT**              | Business logic (validation) can be ported. Schema validation from SimpleSchema can run client-side.                                                                                                                    |
| `patientImport`        | Bulk import patients + optional pictures     | `data` (array of patient objects)                                | None (public)                     | Patients.insert, Patients.addPicture (Images collection write)                                   | **PORT**              | Picture handling is critical: client currently sends base64 `mime64:/` format; server converts to Images collection file. In backendless: store base64 directly in patient.picture field in localStorage or IndexedDB. |
| `doMapReduce`          | Aggregate patient records by date            | `patientId` (string)                                             | None (implicit query)             | PatientRecords.rawCollection.mapReduce                                                           | **STUB** or **DROP**  | Server-side MongoDB aggregation. In backendless: load all PatientRecords client-side and do map/reduce in JS or skip (feature unused?). Check if this is actually called.                                              |
| `searchExamCatalog`    | Search exam catalog with ref rules filtering | `term` (string, max 64), `gender` (string), `ageMonths` (number) | None                              | ExamCatalog.rawCollection.aggregate (MongoDB pipeline)                                           | **PORT** (simplified) | MongoDB aggregation with $filter, $regex. In backendless: load full ExamCatalog and do filtering in JS. Simpler but functional. Add regex escape logic (already in code).                                              |
| `savePatientExam`      | Record exam results + update exam catalog    | `patientId` (string), `doc` (object with results array)          | `medical_doctor` or `super-admin` | PatientExams.insert, ExamCatalog.update/.insert, parseReferenceText logic                        | **PORT**              | Catalog learning (bump usageCount, add reference rules) is business logic—ported as client-side mutations. Role gate becomes localStorage check.                                                                       |

**Key Business Logic to Port:**

- Patient creation (Patients.insert) + simple schema validation
- User management (create, update, roles assignment) — can't validate password server-side in backendless
- Doctor specialty hours CRUD
- Exam result recording + catalog enrichment (usage counts, reference parsing)
- Bulk patient import with picture handling

---

### 2. PUBLICATIONS (server/publish.js)

**File:** `c:\Users\leona\Projects\easy-clinic\src\app\server\publish.js`

These are DDP subscriptions that fetch server data into Meteor collections. In a backendless SPA, they become **static data loads from local storage or a CDN JSON file**.

| Publication            | Collections/Data                                          | Role Gate                                         | Strategy                                                                   |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| (unnamed, roles)       | `Meteor.roles`                                            | None                                              | Load roles.json on app init                                                |
| `users`                | `Meteor.users`                                            | `super-admin`                                     | Load all users from localStorage (users must bootstrap user list)          |
| `singleUser`           | `Meteor.users` {\_id: id}                                 | None                                              | Load single user from localStorage                                         |
| `doctors`              | `Meteor.users` filtered {profile.group: 'medical_doctor'} | None                                              | Filter users collection client-side                                        |
| `singleDoctor`         | Single user doc                                           | None                                              | Load from users cache                                                      |
| `patients`             | `Patients` (all)                                          | None                                              | Load all patients from localStorage/IndexedDB                              |
| `singlePatient`        | Single patient doc                                        | None                                              | Query local patients collection                                            |
| `patientRecords`       | `PatientRecords` {patientId: id}                          | None                                              | Query local records                                                        |
| `importPatients`       | `ImportPatients` (staging, temp)                          | None                                              | Staging collection (keep as IndexedDB temp storage)                        |
| `patient-appointments` | `Appointments` by patientId                               | None                                              | Query local appointments                                                   |
| `appointments`         | `Appointments` (all)                                      | None                                              | Load all appointments                                                      |
| `specialties`          | `Specialties` (catalog)                                   | None                                              | Load specialty list (static-ish)                                           |
| `singleSpecialty`      | Single specialty                                          | None                                              | Load from specialties cache                                                |
| `examCatalog`          | `ExamCatalog` (grows over time)                           | None                                              | Load from localStorage (can be large)                                      |
| `singleExamCatalog`    | Single exam                                               | None                                              | Query local catalog                                                        |
| `patientExams`         | `PatientExams` {patientId: id}                            | `medical_doctor`, `administration`, `super-admin` | Query local patient exams; role gate becomes localStorage check            |
| `schedule`             | `Schedule` (calendar events)                              | None                                              | Load schedule                                                              |
| `patient-schedule`     | `Schedule` by patient                                     | None                                              | Query local schedule                                                       |
| `doctor-schedule`      | `Schedule` by resourceId (doctor)                         | None                                              | Query local schedule                                                       |
| `settings`             | `Settings` (single doc)                                   | None                                              | Load clinic config (work hours, slot duration, appointment value, address) |
| `drugs`                | `Drugs` (reference catalog)                               | None                                              | Load drugs reference                                                       |
| `singleDrug`           | Single drug                                               | None                                              | Query local drugs                                                          |
| `icd10`                | `ICD10` (diagnosis codes)                                 | None                                              | Load ICD10 reference (large; may need lazy loading)                        |
| `documentModels`       | `DocumentModels` (templates)                              | None                                              | Load templates                                                             |
| `singleDocumentModel`  | Single template                                           | None                                              | Query local templates                                                      |
| `formModels`           | `FormModels` (form definitions)                           | None                                              | Load forms                                                                 |
| `singleFormModel`      | Single form                                               | None                                              | Query local forms                                                          |

**Migration Strategy:**

- Bundle static data (specialties, drugs, ICD10, document/form models, roles) as JSON or IndexedDB fixtures on first app load
- Use localStorage/IndexedDB for transactional data (patients, appointments, records, exams, users)
- Implement client-side role checks (read from currentUser object in localStorage)
- For `patientExams`, add localStorage check before serving data

---

### 3. AUTH &amp; ROLES MODEL

**Files:**

- `c:\Users\leona\Projects\easy-clinic\src\app\imports\startup\user-accounts-config.js` (auth configuration)
- `c:\Users\leona\Projects\easy-clinic\src\app\server\fixtures\roles.js` (role definitions)
- `c:\Users\leona\Projects\easy-clinic\src\app\server\fixtures\users.js` (seed users)

**Role Structure:**

- **`default`**: Granted to every user on signup
- **`medical_doctor`**: Doctors (profile.group = 'medical_doctor'); gates `savePatientExam`, `patientExams` publication
- **`super-admin`**: Clinic admin; gates `updateUser`, `doctorSpecialtyHours`, `users` publication, and special access protection for 'leo.lima.web@gmail.com'

**Auth Mechanisms:**

1. **Server-side validation:** `Accounts.validateLoginAttempt` checks `isUserEnabled` flag (lines 172-181 of user-accounts-config.js)
   - Blocks login if `user.isUserEnabled === false`
   - **Cannot be ported to backendless** (no auth server)
2. **Account creation:**
   - `forbidClientAccountCreation: true` (line 18) — signup must go through server methods
   - `postSignUpHook` assigns `default` + user's group role; sets `isUserEnabled: false` (admin must enable)
   - In backendless: fake this by storing roles in localStorage on signup, mark enabled=false by default

3. **Email verification &amp; enrollment:**
   - `enforceEmailVerification: true` — server sends verification emails
   - `Accounts.sendEnrollmentEmail` in `updateUser` and user fixtures
   - **Cannot be ported** (no email server)

4. **Password management:**
   - `Accounts.setPassword` in `updateUser` method
   - Password reset/change routes configured
   - **Cannot be ported** (no secure hashing server-side; client-side crypto possible but risky for medical data)

**Backendless Approach:**

- Remove real authentication; use **fake login** (localStorage-based "current user")
- Store user list in encrypted localStorage or unencrypted (depending on security posture)
- Simulate role checks: `localStorage.getItem('currentUser') &amp;&amp; JSON.parse(...).roles.includes('super-admin')`
- Drop email verification, enrollment, password reset flows (or provide fake stub)
- Note: **This app should NOT be backendless in production for a medical clinic** (HIPAA/compliance concerns)

---

### 4. SCHEDULED NOTIFICATIONS (schedule-notifications.js)

**File:** `c:\Users\leona\Projects\easy-clinic\src\app\server\schedule-notifications.js`

**Purpose:** Synced-cron job that runs every 30 minutes, finds upcoming appointments (within next 24 hours, not yet notified), and sends email + SMS.

**Job Details:**

- **Cron:** `every 30 minutes`
- **Query:** Appointments with `status: 'scheduled'`, `notified: null`, `start &lt;= now + 1440 min (24h)` and `start &gt; now`
- **Actions per appointment:**
  1. Fetch patient doc from Patients collection
  2. If `patient.email` exists: **Email.send()** with formatted appointment details (pt-BR, using moment.js locale)
  3. If `patient.mobile` exists: **HTTP.call('POST')** to Movile SMS API with formatted message
  4. Update Schedule doc: set `notified: true`

**Credentials (hardcoded, redacted):**

- Movile API: `userName` and `AuthenticationToken` in code (**_REMOVED_**)
- Email: via `Accounts.emailTemplates.from` (configured in startup)

**Migration Decision:** **DROP or STUB**

- Email sending is inherently server-only (requires SMTP credentials, IP whitelisting)
- SMS via Movile requires API credentials and live server
- **Options:**
  1. **Drop:** Remove notification feature entirely; users check app manually
  2. **Stub:** Replace with browser notification (Web Notifications API) on client if appointment is within next 24h when user opens app
  3. **External service:** Move to third-party scheduler (Firebase Cloud Functions, AWS Lambda, Zapier) — out of scope for backendless SPA

---

### 5. FILE UPLOADS &amp; IMAGE HANDLING

**Files:**

- `c:\Users\leona\Projects\easy-clinic\src\app\lib\collections\images.js` (ostrio:files collection)
- `c:\Users\leona\Projects\easy-clinic\src\app\lib\collections\patients\patients.js` (Patients.addPicture method)
- `c:\Users\leona\Projects\easy-clinic\src\app\packages\profile-pic-upload\lib\client\picFileUpload.js` (upload UI)

**Current Flow:**

1. Client: `MeteorCamera.getPicture()` or file input → base64 string
2. Client: `Images.insert({file: data, isBase64: true, fileName: 'cam.jpg'})`
3. Server: `ostrio:files` writes to filesystem: `process.env.PWD + '/pictures'`
4. Server: `Patients.addPicture(picture, patientId)` creates Images doc, updates `patient.picture = fileRef._id`
5. Client: Serves image via `/cdn/files/Images/_id` URL

**Constraints:**

- Max file size: 10MB
- Allowed formats: PNG, JPG, JPEG
- Server stores in `/pictures` directory (Node.js filesystem)

**Backendless Approach:**

Option A (Simplest): **Store base64 directly**

- Client keeps base64 string in `patient.picture` field
- Store in localStorage (limit ~5MB per origin) or IndexedDB (higher limit, but slower)
- Serve via `data:image/jpeg;base64,...` data URLs in `&lt;img&gt;` tags
- Pro: No file system; works offline
- Con: Base64 is ~33% larger than binary; localStorage quota issues at scale

Option B (Progressive): **Use IndexedDB with Blob storage**

- Convert base64 to Blob on client
- Store Blob in IndexedDB (structured storage, larger quota, ~50MB typical)
- Create object URLs (`URL.createObjectURL(blob)`) to serve in `&lt;img&gt;` tags
- Pro: Better performance, more storage
- Con: Complex, requires careful cleanup

**Recommendation:** Option A for MVP (base64 in localStorage/IndexedDB), migrate to Option B if storage becomes bottleneck.

**Code Porting:**

- Remove `Images.insert()` calls; replace with direct base64 storage in patient doc
- Remove `Patients.addPicture()` method
- Update image rendering: `imgPath` helper to return `data:` URL instead of `/cdn/files/` URL

---

### 6. OTHER SERVER-ONLY MOVING PARTS

**Email System:**

- **File:** `c:\Users\leona\Projects\easy-clinic\src\app\server\lib\accounts\emails.js`
- **Features:**
  - `Accounts.emailTemplates.verifyEmail` — verification link sent on signup
  - `Accounts.emailTemplates.resetPassword` — password reset email
  - `Accounts.emailTemplates.enrollAccount` — admin enrollment email
  - `Accounts.emailTemplates.siteName` = "Clínica Fácil"
  - `Accounts.emailTemplates.from` = "Clínica Fácil &lt;contato@devhouse.com.br&gt;"
- **Decision:** **DROP** (no email server in backendless)

**Settings &amp; Environment:**

- **File:** `c:\Users\leona\Projects\easy-clinic\src\app\server\fixtures\_settings.js`
- **Env vars:**
  - `MAIL_URL = "smtp://***REMOVED***@email-smtp.us-west-2.amazonaws.com:587"` (AWS SES)
  - `ROOT_URL = "https://clinicafacil.devhouse.com.br"`
- **Clinic Settings (stored in Settings collection):**
  - `workHoursStart`, `workHoursEnd`
  - `slotDuration` (appointment slot, minutes)
  - `appointmentValue` (default price, BRL)
  - `address` (printed address in documents)
- **Decision:** Store settings in a JSON file bundled with app or in localStorage; **no need for env vars in backendless** (all config baked into client)

**Accounts Configuration:**

- `forbidClientAccountCreation: true` — cannot enforce in backendless (no server to gate signup)
- `enablePasswordChange: true`, `sendVerificationEmail: true` — cannot enforce (no email, no password hashing)
- **In backendless:** Remove these constraints; allow direct signup but note the security implications

**Server Startup:**

- **File:** `c:\Users\leona\Projects\easy-clinic\src\app\server\main.js`
- Imports user-accounts-config, starts SyncedCron
- **In backendless:** Remove SyncedCron, simplify to just load initial config

---

### SUMMARY: PORT/DROP/STUB DECISIONS

| Category                        | Decision            | Effort     | Notes                                                                                                  |
| ------------------------------- | ------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| **User Management**             | PORT (with caveats) | Medium     | Can't validate password or send email; stub login/roles. Create/update/delete users as local data ops. |
| **Patient CRUD**                | PORT                | Low        | Direct Patients collection mutations; add picture as base64.                                           |
| **Appointments**                | PORT                | Low        | Calendar event storage; no scheduling logic server-side.                                               |
| **Exam Catalog**                | PORT (simplified)   | Low-Medium | Map/reduce replaced with client-side JS filtering; catalog learning works locally.                     |
| **Patient Exams &amp; Records** | PORT                | Low        | Simple inserts/queries; role gates become localStorage checks.                                         |
| **Doctor Specialty Hours**      | PORT                | Low        | Update user doc; role gate becomes localStorage check.                                                 |
| **Notifications (Email/SMS)**   | DROP                | N/A        | Use browser notifications or external service.                                                         |
| **File Uploads (Pictures)**     | PORT (base64)       | Low        | Store base64 directly in patient doc; serve via data URLs or IndexedDB Blobs.                          |
| **Auth/Verification**           | STUB                | Medium     | Fake login with localStorage; drop email verification and password hashing.                            |
| **Roles**                       | PORT (fake)         | Low        | Check localStorage current-user roles; no server enforcement.                                          |

---

### FILE PATHS SUMMARY

**Core Server Logic:**

- `src/app/server/methods.js` — 6 main methods (user, doctor, patient import, exams, catalog search)
- `src/app/server/publish.js` — 24 publications (data subscriptions)
- `src/app/server/schedule-notifications.js` — 30-min cron for email/SMS (DROP)
- `src/app/server/stats-methods.js` — 2 dashboard aggregation methods (PORT with JS logic)
- `src/app/server/main.js` — startup (simplify)

**Auth &amp; Configuration:**

- `src/app/imports/startup/user-accounts-config.js` — auth setup (mostly DROP/STUB)
- `src/app/server/lib/accounts/emails.js` — email templates (DROP)
- `src/app/server/fixtures/roles.js` — role definitions (PORT as data)
- `src/app/server/fixtures/users.js` — seed users (PORT as data)
- `src/app/server/fixtures/settings.js` — clinic settings (PORT as data)

**Collections &amp; Models:**

- `src/app/lib/collections/images.js` — file storage (replace with base64)
- `src/app/lib/collections/patients/patients.js` — Patients.addPicture (remove)
- `src/app/lib/collections/patients/_patientSchema.js` — validation schema (port to client)
- `src/app/packages/profile-pic-upload/` — upload UI (update for data URL)

---

### CRITICAL BUSINESS LOGIC TO PRESERVE

1. **Patient data:** name, DOB, gender, CPF, RG, marital status, address, contact, insurance
2. **User roles:** default, medical_doctor, super-admin (with permission gates)
3. **Doctor specialties &amp; hours:** linked to users, affects scheduling
4. **Appointments:** date/time, patient, doctor, status (scheduled/completed/cancelled), notification flag
5. **Medical records:** patient exams, prescriptions, forms, medical certificates, documents
6. **Exam catalog:** name, unit, reference rules (age/gender-dependent), usage counts
7. **Clinic settings:** work hours, slot duration, appointment value, address
8. **Data export/import:** CSV patient bulk import with validation

---

### MIGRATION CHALLENGES

1. **No Auth Server:** Can't hash passwords, verify email, send enrollment links. Recommend: fake login or external auth provider (Firebase Auth).
2. **No Email/SMS:** Drop notifications or use third-party service (Firebase Messaging, Twilio, etc.).
3. **Storage Limits:** IndexedDB typically 50MB; large apps (ICD10 codes, many patient records) may hit quota. Solution: lazy-load, compress, or use service worker cache.
4. **Data Sync:** No server to sync changes across devices/tabs. Solution: service worker + broadcast channel API for same-device sync; multi-device requires external backend (defeats backendless goal).
5. **HIPAA/Compliance:** Backendless SPA with patient medical records is risky. Consider: client-side encryption, legal review.
6. **Concurrency:** Multiple users (doctors, nurses) accessing same patient record offline → merge conflicts. Solution: simple CRDT, last-write-wins, or CRX (Conflict-free Replicated Data Types).

---

### ESTIMATED EFFORT

- **Methods (6 → 6):** 2-3 days (logic porting, validation)
- **Publications (24 → local queries):** 1-2 days (IndexedDB setup, query builders)
- **Auth (fake login):** 1 day (localStorage, role checks)
- **Notifications (drop/stub):** 0.5 days (remove + browser API stub)
- **Images (base64):** 0.5 days (data handling)
- **Testing &amp; QA:** 3-5 days
- **Total:** ~2-3 weeks for MVP

This report is complete and ready for architecture decisions on which pieces to port, drop, or stub.</result>
<usage><subagent_tokens>43950</subagent_tokens><tool_uses>31</tool_uses><duration_ms>111194</duration_ms></usage>
</task-notification>

<task-notification>
<task-id>aa8aefeba21f57436</task-id>
<tool-use-id>toolu_015CFT7n2D2Pr2xrHekVPY3J</tool-use-id>
<output-file>C:\Users\leona\AppData\Local\Temp\claude\c--Users-leona-Projects-easy-clinic\d9592a70-a72a-48e4-8fe3-0383c3ca02ff\tasks\aa8aefeba21f57436.output</output-file>
<status>completed</status>
<summary>Agent "Explore data model and fixtures" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>Excellent! Now I have a complete picture. Let me create a comprehensive summary report.

## COMPREHENSIVE DATA LAYER ANALYSIS – Clínica Fácil (Easy Clinic)

### 1. COLLECTION INVENTORY

**All Mongo Collections** (16 defined collections):

| Collection Name | Global Variable  | Mongo Name                                  | Purpose                                                                             |
| --------------- | ---------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| Patients        | `Patients`       | `patients`                                  | Patient demographics, contact, medical identifiers                                  |
| PatientRecords  | `PatientRecords` | `patient-records`                           | Loose clinical notes/records attached to patients                                   |
| PatientExams    | `PatientExams`   | `patient-exams`                             | Lab exam results with date and createdBy tracking                                   |
| Appointments    | `Appointments`   | `appointments`                              | Schedule appointments with patient/user references                                  |
| ImportPatients  | `ImportPatients` | `importPatients`                            | Transient collection for bulk patient CSV import validation                         |
| Drugs           | `Drugs`          | `drugs`                                     | Pharmacy reference: ~2,500+ Brazilian drugs with HTML info                          |
| ICD10           | `ICD10`          | `icd10`                                     | Disease classification: ~14,500+ ICD-10 pt-BR diagnoses                             |
| Schedule        | `Schedule`       | `schedule`                                  | Calendar events (availability blocks, appointments)                                 |
| Specialties     | `Specialties`    | `specialties`                               | Medical specialties (~57 pt-BR entries: Cardiologia, Pediatria, etc.)               |
| ExamCatalog     | `ExamCatalog`    | `exam-catalog`                              | Lab test reference ranges (gender/age-aware) with usage stats                       |
| DocumentModels  | `DocumentModels` | `document-models`                           | Templates for printables (prescriptions, medical certs, exam requests)              |
| FormModels      | `FormModels`     | `form-models`                               | Clinical forms (triage/vital signs, anamnesis) with formBuilder JSON                |
| Settings        | `Settings`       | `settings`                                  | Clinic-wide config: work hours, slot duration, appointment cost, address            |
| Images          | `Images`         | `Images` (FilesCollection)                  | Patient profile pictures (server-side store in `./pictures/`)                       |
| Meteor.users    | `Meteor.users`   | `meteor_accounts_loginServiceConfiguration` | Accounts, roles, doctor profiles (firstName, lastName, CRM, specialties, workHours) |
| Roles           | `Meteor.roles`   | `roles`                                     | RBAC: `default`, `medical_doctor`, `super-admin`                                    |

**BSON Dump Sizes** (from `/db/backups/meteor-20260628-170955/`):

- **drugs.bson**: 2.9 MB (~1,500+ drug records with HTML descriptions)
- **icd10.bson**: 25 KB (~14,500+ ICD codes, single string per record)
- **patients.bson**: 692 KB (production patient data with images referenced)
- **Images.bson**: 461 KB (inline image blobs)
- **users.bson**: 12 KB (~1-2 user records with roles)
- Other collections: &lt; 10 KB each (settings, schedule, appointments, etc.)

---

### 2. SCHEMA SHAPES &amp; FIELD STRUCTURES

#### **Patient Schema** (`src/app/lib/collections/patients/_patientSchema.js`)

**Core Fields** (attached via `Patients.attachSchema(new SimpleSchema(patientSchema))`):

- **picture** (String, optional): Image file ID reference to `Images` collection
- **name** (String, required): Max 100 chars, trimmed
- **records** (String, optional): Medical record number (max 30)
- **dateOfBirth** (Date, required): With bootstrap-datepicker (pt-BR locale)
- **gender** (String, enum): `'M'` | `'F'` (required)
- **maritalStatus** (String, optional, enum): `single`, `married`, `life_partner`, `separated`, `divorced`, `widowed`
- **skinColor** (String, optional, enum): `white`, `brown`, `black`, `mixed`, `other`
- **placeOfBirth** (String, optional): Max 100 chars
- **literacy** (String, optional, enum): `illiterate` → `phd` (7 levels)
- **CPF** (String, optional): **UNIQUE, SPARSE** (Brazilian tax ID, masked as `000.000.000-00`)
- **RG** (String, optional): Identity number (max 20)
- **titularCPF** (String, optional): Health insurance holder CPF
- **fathersName, mothersName** (String, optional): Max 100 each
- **occupation** (String, optional): Max 100
- **recommendedBy** (String, optional): Referral source (max 100)
- **returnDate** (Date, optional): Follow-up appointment target date
- **email** (String, optional): Regex validated, max 255
- **phone** (String, optional): Masked `(00) 0000-0000` (max 15)
- **mobile** (String, required): Masked `(00) 00000-0000` (max 15)
- **zip, streetAddress_1, streetAddress_2, bairro, city, state** (String, optional): Full address (CEP masked `00000-000`)
- **obs** (String, optional): Textarea field for observations
- **createdAt** (Date, auto): Set by `before.insert` hook

**Hooks**:

- `Patients.before.insert()`: Automatically sets `createdAt = new Date()`

**Allow/Deny Rules**:

- **Allow**: insert, update, remove — ALL PASS (permissive, no server-side gate)
- **Deny**: Commented out (disabled)

#### **PatientRecords Schema**

```javascript
{
  date: Date (required),
  patientId: String (required),
  recordType: String (optional),
  recordName: String (optional),
  record: [Object] (blackbox: true) // Flexible JSON array
}
```

**Allow/Deny**: insert, update, remove all return `true`

#### **PatientExams Schema**

```javascript
{
  patientId: String (required),
  laboratory: String (optional, trim, max 100),
  datePerformed: Date (required),
  createdAt: Date (optional, auto-set by hook),
  createdBy: String (optional, auto-set by hook),
  results: [Object] (blackbox: true) // Lab test results as JSON
}
```

**Hooks**:

- `PatientExams.before.insert()`: Sets `createdAt`, `createdBy = userId`

**Allow/Deny Rules**:

- **Allow**: ALL OPERATIONS RETURN FALSE (locked down)
- **Deny**: ALL OPERATIONS RETURN TRUE
- **Note**: Writes must go through server method `savePatientExam` (role-gated)

#### **Appointments Schema**

```javascript
{
  'patient._id': String (required),
  'patient.name': String (required),
  start: Date (required),
  end: Date (optional),
  'user._id': String (required),
  'user.name': String (required),
  status: String (enum: 're-scheduled', 'in_progress', 'completed', 'no_show', optional)
}
```

**Allow/Deny**: Permissive (insert, update, remove all return `true`)

#### **Drugs Schema**

```javascript
{
  name: String (required, trim),
  commercial_name: String (optional, trim),
  generic_name: String (optional, trim),
  special_prescription: Boolean (required),
  popular_pharmacy_name: String (optional, trim),
  search: String (optional, textarea) // Denormalized searchable text,
  html: String (optional, textarea) // Full HTML drug info (~1KB-3KB per record)
}
```

**Allow/Deny**: Permissive (all return `true`)

#### **ICD10 Schema**

```javascript
{
  icd: String(required, trim); // e.g. "C00-C75-Neoplasias..."
}
```

**Allow/Deny**: Permissive

#### **Schedule Schema**

```javascript
{
  resourceId: String (required),
  constraint: String (required),
  start: Date (required),
  end: Date (required),
  title: String (required),
  patient: String (optional),
  status: String (required),
  notified: Boolean (optional)
}
```

**Allow/Deny**: Insert is gated (checks overlap), update/remove permissive

#### **ExamCatalog Schema**

```javascript
{
  name: String (required, trim, max 100),
  unit: String (optional, trim, max 30),
  usageCount: Number (optional, default 0),
  createdAt: Date (auto),
  createdBy: String (auto),
  referenceRules: [Object] (optional) // Age/gender-specific ranges
    - gender: 'todos' | 'M' | 'F',
    - ageMin/ageMax: Number (months, e.g. 144 = 12 years),
    - min/max: Number (decimal),
    - displayText: String (pt-BR formatted, e.g. "13,0 - 17,0 g/dL")
}
```

**Hooks**: `ExamCatalog.before.insert()` sets `createdAt`, `createdBy`, defaults `usageCount = 0`

**Allow/Deny**: Role-gated (`super-admin`, `administration`, `medical_doctor`)

#### **DocumentModels &amp; FormModels Schema**

Both follow the same pattern:

```javascript
{
  name: String (required, trim),
  description: String (required, trim, textarea),
  model: String | [Object] (for forms: formBuilder field definitions array),
  type: String (DocumentModels only: 'prescription', 'medical_certificate', 'exam_request')
}
```

**FormModels.model example**:

```json
[
  { "type": "header", "subtype": "h2", "label": "Triagem e Sinais Vitais" },
  {
    "type": "number",
    "label": "Pressão Arterial Sistólica - mmHg",
    "name": "pressao-sistolica"
  }
  // ...
]
```

**DocumentModels.model**: HTML string with `#PLACEHOLDER` tokens (e.g., `#NOME_DO_PACIENTE`, `#DATA_DA_CONSULTA`, `#ASSINATURA_PROFISSIONAL`)

#### **Settings Schema**

```javascript
{
  workHoursStart: String (required, max 5, e.g. "05:00"),
  workHoursEnd: String (required, max 5, e.g. "23:00"),
  slotDuration: Number (optional, min 1, default 20 mins),
  appointmentValue: Number (optional, decimal, e.g. 250.00 BRL),
  address: String (required, textarea with HTML)
}
```

**Single document**: Only one Settings record per clinic (singleton pattern)

#### **Meteor.users (Schema.User)**

```javascript
{
  profile: {
    firstName: String,
    lastName: String,
    group: String (enum: 'medical_doctor', 'administration', etc.),
    language: String,
    CRM: String (optional, doctor registration ID),
    signature: String (optional, base64 image),
    picture: String (optional, Images file ID)
  },
  emails: [{ address: String (email), verified: Boolean }],
  services: Object (optional, blackbox),
  roles: [String], // Array of role names
  isUserEnabled: Boolean,
  isSuperAdmin: Boolean,
  specialties: [String] (optional, doctor profiles),
  workHours: [[workHoursSchema]] (optional, blackbox, nested array of start/end times),
  createdAt: Date
}
```

**Allow/Deny**:

- **Allow**: All operations return `false` (no direct client writes)
- **Deny**: All operations return `true` (explicit block)
- **Enforcement**: All user mutations via `Meteor.methods.updateUser()` (server-side)

---

### 3. SERVER-SIDE SEED/FIXTURE DATA

**Location**: `/src/app/server/fixtures/`

| Fixture File         | Collection     | Record Count   | Format                                                              | Load Strategy                                                |
| -------------------- | -------------- | -------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `specialties.js`     | Specialties    | ~57 records    | JavaScript array of `{name: String}`                                | Bulk insert if empty (\_.each + insert)                      |
| `users.js`           | Meteor.users   | 1 default user | Fixture: leonardo@... (super-admin)                                 | `Accounts.createUser()` + role assignment                    |
| `roles.js`           | Meteor.roles   | 3 roles        | `['default', 'medical_doctor', 'super-admin']`                      | `Roles.createRole()` if not exist                            |
| `settings.js`        | Settings       | 1 singleton    | Default clinic config                                               | Single insert: work hours `05:00-23:00`, slot 30min, BRL 250 |
| `drugs.pt-BR.js`     | Drugs          | ~1,500+        | JavaScript array of objects with HTML/search                        | **14,565 lines**, bulk insert if empty                       |
| `icd10.pt-BR.js`     | ICD10          | ~14,500+       | JavaScript array of strings (ICD code + description)                | **5,748 lines**, bulk insert if empty                        |
| `form-models.js`     | FormModels     | 2+ forms       | Pre-configured triage/anamnesis with formBuilder JSON               | Bulk insert if empty                                         |
| `document-models.js` | DocumentModels | 5+ templates   | HTML prescription/certificate/exam-request templates                | Bulk insert if empty                                         |
| `exam-catalog.js`    | ExamCatalog    | 100+ exams     | Hemograma, biochemistry, immunology with gender+age reference rules | Insert on server startup                                     |

**Default User** (from `users.js`):

```javascript
{
  email: "leo.lima.web@gmail.com",
  password: "123456",
  profile: {
    firstName: "Leonardo",
    lastName: "Lima de Vasconcellos",
    group: "medical_doctor",
    language: "en"
  },
  roles: ['default', 'medical_doctor', 'super-admin']
}
```

**Default Settings** (from `settings.js`):

```javascript
{
  workHoursStart: '05:00',
  workHoursEnd: '23:00',
  slotDuration: 30,
  appointmentValue: 250,
  address: '&lt;p&gt;Av Rio Branco, 547 - sala 705&lt;/p&gt;&lt;p&gt;Centro - Florianópolis - SC&lt;/p&gt;'
}
```

---

### 4. COLLECTION HOOKS (`matb33:collection-hooks`)

Only **3 hooks** defined across all collections:

| Collection     | Hook               | Behavior                                                                   |
| -------------- | ------------------ | -------------------------------------------------------------------------- |
| `Patients`     | `.before.insert()` | Auto-sets `createdAt = new Date()`                                         |
| `PatientExams` | `.before.insert()` | Auto-sets `createdAt`, `createdBy = userId`                                |
| `ExamCatalog`  | `.before.insert()` | Auto-sets `createdAt`, `createdBy = userId`, `usageCount = 0` if undefined |

**No `.after.*` hooks** or `.update`/`.remove` hooks defined.

---

### 5. ALLOW/DENY RULES SUMMARY

| Collection         | Insert                                                            | Update                | Remove                | Notes                                           |
| ------------------ | ----------------------------------------------------------------- | --------------------- | --------------------- | ----------------------------------------------- |
| **Patients**       | `true`                                                            | `true`                | `true`                | **Permissive**                                  |
| **PatientRecords** | `true`                                                            | `true`                | `true`                | **Permissive**                                  |
| **PatientExams**   | `false`                                                           | `false`               | `false`               | **Locked down** — writes via server method only |
| **Appointments**   | `true`                                                            | `true`                | `true`                | **Permissive**                                  |
| **ImportPatients** | `true`                                                            | `true`                | `true`                | **Permissive** (transient import staging)       |
| **Drugs**          | `true`                                                            | `true`                | `true`                | **Permissive**                                  |
| **ICD10**          | `true`                                                            | `true`                | `true`                | **Permissive**                                  |
| **Schedule**       | Insert gated (no overlap check)                                   | `true`                | `true`                | Insert validates event overlap                  |
| **Specialties**    | `true`                                                            | `true`                | `true`                | **Permissive**                                  |
| **ExamCatalog**    | Role gated: `['super-admin', 'administration', 'medical_doctor']` | Role gated            | Role gated            | Restricted CRUD                                 |
| **Settings**       | `true`                                                            | `true`                | `true`                | **Permissive**                                  |
| **Meteor.users**   | `false` + deny `true`                                             | `false` + deny `true` | `false` + deny `true` | **Fully locked** — use methods only             |
| **Meteor.roles**   | Default published                                                 | —                     | —                     | Auto-published to all users                     |

---

### 6. CLIENT-SIDE MIRRORING WITH `ground:db` &amp; SUBSCRIPTIONS

**File**: `/src/app/client/main.js` (lines 19–30)

```javascript
Meteor.startup(function () {
  // Client Persistent Collections (IndexedDB/localStorage via ground:db)
  localICD10 = new Ground.Collection('localICD10');
  localICD10.observeSource(ICD10.find());
  Meteor.subscribe('icd10');

  localDrugs = new Ground.Collection('localDrugs');
  localDrugs.observeSource(Drugs.find());
  Meteor.subscribe('drugs');

  // Stop observing after 60 seconds (locks in-memory cache)
  Meteor.setTimeout(() =&gt; {
    localICD10.stopObserver();
  }, 60000);
});
```

**Strategy**:

- **Ground.Collection** wraps collections into persistent browser storage (IndexedDB if available, fallback to localStorage)
- **observeSource()** mirrors the server `ICD10` and `Drugs` collections into `localICD10` and `localDrugs`
- **stopObserver()** after 60s prevents further updates (freeze in-browser cache)
- **Meteor.subscribe()** fetches both collections (no filtering)

**Published Collections** (via `/src/app/server/publish.js`):

- `icd10` — All ICD-10 records (no pagination/filtering)
- `drugs` — All drug records (no pagination/filtering)
- `patients` — All patient records
- `patientRecords` — By patientId
- `patientExams` — By patientId (role-gated: `medical_doctor`, `administration`, `super-admin`)
- `appointments`, `patient-appointments` — Schedule data
- `schedule`, `patient-schedule`, `doctor-schedule` — Calendar events
- `specialties`, `examCatalog`, `documentModels`, `formModels` — Reference data
- `users` — All users (if super-admin), otherwise empty
- `settings` — Clinic configuration
- `roles` — Auto-published (null pub)

---

### 7. SERVER-SIDE METHODS &amp; STATE

**File**: `/src/app/server/methods.js`

**Stateful Operations**:

| Method                                  | Role Gate              | Stateful Action                                                                           |
| --------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `updateUser(userId, newPassword, data)` | `super-admin`          | Create/update user, set roles, send enrollment email                                      |
| `doctorSpecialtyHours(userId, data)`    | `super-admin`          | Update doctor's `workHours` (nested array)                                                |
| `testPatientImport(data)`               | None (but should)      | Validate patient CSV data: insert to `ImportPatients`, then **remove all** (clears state) |
| `patientImport(data)`                   | None (should be gated) | Bulk insert patients from CSV, handle base64 pictures via `Patients.addPicture()`         |

**Note**: No other complex server state machine. Accounts/password are handled by Meteor.Accounts.

---

### 8. DATA FLOW DIAGRAM (Backendless Migration Target)

```
┌─ Browser Storage (IndexedDB/localStorage) ─────────────┐
│                                                          │
│  ├─ localICD10 (all 14.5k records, 25KB)               │
│  ├─ localDrugs (all 1.5k+ records, 2.9MB)              │
│  ├─ Patients (readonly reference)                       │
│  ├─ PatientRecords, Appointments, Schedule             │
│  ├─ ExamCatalog, Specialties, DocumentModels           │
│  ├─ FormModels                                          │
│  └─ User profile (logged-in user data)                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**JSON Fixture Files Needed**:

1. **icd10.json** (~14.5k records): Extracted from fixture (one string per record)
2. **drugs.json** (~1.5k+ records): Extracted from fixture with full schema
3. **specialties.json**: 57 specialty names
4. **exam-catalog.json**: ~100+ lab tests with reference rules
5. **document-models.json**: 5+ printable templates (HTML + placeholders)
6. **form-models.json**: 2+ clinical forms (formBuilder definitions)
7. **settings.json**: Single clinic config document
8. **users.json**: Default user(s) with roles (no passwords for backendless)

---

### 9. KEY STATEFUL PATTERNS TO REPRODUCE CLIENT-SIDE

1. **Patient CRUD** → Use localStorage + unique ID generator (UUID)
2. **CPF Uniqueness** → Client-side duplicate check before insert
3. **Image Storage** → Base64 inline in patient record or separate blob store
4. **Appointment Overlap Check** → Client-side validation before save
5. **Form Builder** → Render `FormModels.model` array via formBuilder library (already in project)
6. **Print Templates** → Use `DocumentModels.model` (HTML) with placeholder replacement
7. **Reference Range Lookup** → ExamCatalog age/gender matching in JavaScript
8. **User Roles** → Simplified: 1-2 client roles (e.g., read-only vs. can-edit)
9. **Timestamps** → Auto-set `createdAt`, `updatedAt` on insert/update

---

### FILE PATHS (Complete Reference)

**Collection Definitions**:

- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/patients/patients.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/patients/_patientSchema.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/patients/patient-records.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/patients/patient-exams.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/patients/appointments.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/patients/importPatients.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/drugs.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/icd10.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/schedule.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/specialties.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/exam-catalog.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/document-models.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/form-models.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/images.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/Settings.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/lib/collections/users.js`

**Fixtures**:

- `/c/Users/leona/Projects/easy-clinic/src/app/server/fixtures/specialties.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/server/fixtures/users.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/server/fixtures/roles.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/server/fixtures/settings.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/server/fixtures/drugs.pt-BR.js` (2.9 MB)
- `/c/Users/leona/Projects/easy-clinic/src/app/server/fixtures/icd10.pt-BR.js` (25 KB)
- `/c/Users/leona/Projects/easy-clinic/src/app/server/fixtures/form-models.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/server/fixtures/document-models.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/server/fixtures/exam-catalog.js`

**Server Logic**:

- `/c/Users/leona/Projects/easy-clinic/src/app/server/methods.js`
- `/c/Users/leona/Projects/easy-clinic/src/app/server/publish.js`

**Client Mirroring**:

- `/c/Users/leona/Projects/easy-clinic/src/app/client/main.js`

**BSON Dumps** (reference data snapshots):

- `/c/Users/leona/Projects/easy-clinic/db/backups/meteor-20260628-170955/` (directory with collection exports)

---

### SUMMARY FOR BACKENDLESS MIGRATION

**What must be shipped in browser**:

1. **~14.5k ICD-10 codes** (25 KB JSON) — Will be mirrored via `ground:db` → IndexedDB
2. **~1.5k+ drugs with HTML** (2.9 MB JSON) — Critical for prescription UI, will be cached locally
3. **57 specialties** (&lt; 5 KB)
4. **100+ lab tests** with age/gender-stratified reference ranges (&lt; 200 KB)
5. **5+ document templates** (HTML with placeholders) — For print view
6. **2+ form definitions** (formBuilder JSON) — For clinical forms

**What stays server-side in original app** (but can be localStorage in backendless):

- **Patients** (patient demographic records) — **Encrypt localStorage or fetch on demand**
- **Appointments** (schedule data) — Sync-able
- **User roles/permissions** — Simplified to client-side flags

**Hooks to remove**:

- None required for backendless; hooks were convenience for server-side automation.

**Allow/deny rules**:

- Irrelevant in backendless; replaced by client-side validation.

## COMPREHENSIVE FRONTEND INVENTORY FOR METEOR/BLAZE MIGRATION

Based on my thorough analysis of the codebase, here is the complete frontend inventory for **Clínica Fácil** (Easy Clinic) — a medical clinic management SPA built on Meteor 1.4 + Blaze. This will inform your migration scope to a backendless static SPA/PWA.

---

### 1. ROUTING ARCHITECTURE

**File:** `src/app/imports/startup/routes.js`

**Routing Framework:** FlowRouter + BlazeLayout

- **Authentication Guard:** `AccountsTemplates.ensureSignedIn` with exceptions for public routes
- **Public Routes (No Auth Required):**
  - `/signIn` - Sign in
  - `/signUp` - Sign up
  - `/forgotPwd` - Forgot password
  - `/changePwd`, `/resetPwd` - Password management
  - `/verifyEmail`, `/enrollAccount`, `/resendVerificationEmail` - Email verification
  - `/privacy`, `/terms-of-use` - Static pages
  - `/notFound` - 404 error page

**Main Protected Routes (27 routes total):**

| Route                     | Template           | Subscriptions                                                                | Purpose                                             |
| ------------------------- | ------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| `/dashboard`              | dashboard          | schedule                                                                     | KPI dashboard + timeline                            |
| `/schedule`               | schedule           | doctors, patients, schedule, settings                                        | Appointment calendar (FullCalendar Scheduler)       |
| `/patients`               | patientList        | patients                                                                     | Patient list with DataTable                         |
| `/patients/create`        | patientForm        | (none on creation)                                                           | New patient form                                    |
| `/patients/:_id`          | patientForm        | patient, formModels, document-models, records, exams, settings, appointments | Patient detail/edit view                            |
| `/reports/appointments`   | reportAppointments | appointments                                                                 | Appointment analytics report                        |
| `/reports/patients`       | reportPatients     | patients                                                                     | Patient demographics report (Chart.js)              |
| `/reports/production`     | reportProduction   | (none)                                                                       | Production/billing metrics                          |
| `/settings`               | settingsForm       | settings                                                                     | Global app settings (work hours, slot duration)     |
| `/specialties`            | specialtyList      | specialties                                                                  | Medical specialty list                              |
| `/specialties/create`     | specialtyForm      | (none)                                                                       | Create specialty                                    |
| `/specialties/:_id`       | specialtyForm      | specialty                                                                    | Edit specialty                                      |
| `/exam-catalog`           | examCatalogList    | examCatalog                                                                  | Exam type catalog                                   |
| `/exam-catalog/create`    | examCatalogForm    | (none)                                                                       | Create exam type                                    |
| `/exam-catalog/:_id`      | examCatalogForm    | examCatalog                                                                  | Edit exam type                                      |
| `/doctors`                | doctorList         | doctors                                                                      | Doctor list                                         |
| `/doctors/:_id`           | doctorForm         | specialties, doctor                                                          | Doctor profile/edit                                 |
| `/icd10`                  | icd10List          | (none)                                                                       | ICD-10 diagnosis search (offline Ground.Collection) |
| `/drugs`                  | drugList           | (none)                                                                       | Drug catalog (offline Ground.Collection)            |
| `/drugs/create`           | drugForm           | (none)                                                                       | Create drug                                         |
| `/drugs/:_id`             | drugForm           | drugs                                                                        | Edit drug                                           |
| `/users`                  | users              | users                                                                        | User management (admin only)                        |
| `/import`                 | import             | importPatients                                                               | CSV patient import + validation                     |
| `/document-models`        | documentModelList  | document-models                                                              | Medical document templates                          |
| `/document-models/create` | documentModelForm  | (none)                                                                       | Create document template                            |
| `/document-models/:_id`   | documentModelForm  | document-model                                                               | Edit document template                              |
| `/form-models`            | formModelsList     | formModels                                                                   | Custom form templates                               |
| `/form-models/create`     | formModelsForm     | (none)                                                                       | Create custom form                                  |
| `/form-models/:_id`       | formModelsForm     | formModel                                                                    | Edit custom form                                    |
| `/logout`                 | (redirect)         | (none)                                                                       | Logout and redirect                                 |

**Route Change Prevention:** Unsaved changes detection using `Session.unsavedChanges` flag + browser history manipulation to prevent navigation loss.

---

### 2. FEATURE/TEMPLATE INVENTORY (30 JS Files, 32 HTML Templates)

**Total Client Template Files:** 62 (32 HTML + 30 JS)

#### **PATIENTS FEATURE** (Complex, ~200+ LOC per file)

- **Folder:** `src/app/client/views/templates/patients/`
- **Files:** 6 templates (260+ total JS LOC)
- **Description:** Core patient management with record lifecycle tracking
  - `patient_list/` (2 files) - DataTable-driven list with avatar rendering, sortable/searchable, inline links
  - `patient_form/` (2 files) - Complex form handling:
    - AutoForm integration for validation
    - Appointment start/stop workflow (transitions schedule status)
    - Dynamic createdAt display
    - Image uploads with Gravatar fallback
    - Delete confirmation with SweetAlert
    - Navigation blocking for unsaved changes
  - `patient_record/` (2 files) - Patient medical records display
  - `patient_evolution/` (2 files) - Patient history timeline
  - `patient_timeline/` (2 files) - Chronological event view
  - `exam_results/` (2 files) - Modal for exam result viewing
- **Complexity:** HIGH - Heavy DOM manipulation, reactive form state, server method calls
- **Key Tech:** AutoForm, DataTables, SweetAlert, Gravatar, moment.js

#### **SCHEDULE FEATURE** (Most Complex, ~540 LOC)

- **Folder:** `src/app/client/views/templates/schedule/`
- **Files:** 2 templates (540 total JS LOC)
- **Description:** Appointment calendar with resource-based scheduling
  - `schedule.js` - FullCalendar Scheduler integration:
    - Multiple view modes: timelineDay, timelineThreeDays, agendaDay, agendaWeek, listDay, listWeek, month
    - Resource rendering: Doctor profiles with images/Gravatars, specialties, work hours
    - Selection constraints: Doctor work hours validation on slot selection
    - Event color coding: 6 appointment statuses (to-confirm, waiting, scheduled, attending, no-show, finished)
    - Modal form for appointment editing/patient selection using Chosen.js
    - Reactive data updates with fullCalendar refetch
    - Date picker with bootstrap-datepicker integration
    - Timezone hardcoded to "America/Sao_Paulo" (needs parameterization)
    - Settings-driven config: work hours (06:00-23:00), slot duration (20 min default)
  - `scheduleDayHours.js` - Work hours day view
- **Complexity:** VERY HIGH - Complex interactive calendar, resource management, constraint logic
- **Key Tech:** FullCalendar Scheduler v4, bootstrap-datepicker, Chosen.js, moment.js, Canvas-based rendering

#### **DASHBOARD** (Moderate, ~230 LOC)

- **Folder:** `src/app/client/views/templates/dashboard/`
- **Files:** 2 files
- **Description:** KPI dashboard with Chart.js visualizations
  - Server call to `dashboardStats` (reactive var)
  - 4 Chart.js instances: appointments by month (bar), records by type (doughnut), age groups (bar), gender (doughnut)
  - Timeline legend with appointment statuses
  - Real-time appointment listing for current user
  - Reactive language switching for chart labels
  - Currency formatting (BRL: "R$ X.XXX,XX")
- **Complexity:** MODERATE - Charting, server aggregation dependency
- **Key Tech:** Chart.js v2, moment.js, moment locale, Reactive Tracker

#### **REPORTS** (Moderate, 3 templates, ~240 LOC combined)

- **Folder:** `src/app/client/views/templates/reports/`
- **Templates:**
  - `reportAppointments/` (2 files) - Sortable appointment table
  - `reportPatients/` (2 files) - Demographics with Chart.js (age/gender distribution)
  - `reportProduction/` (2 files) - Billing/production metrics
- **Complexity:** MODERATE - Similar to dashboard; DataTables + Chart.js
- **Key Tech:** DataTables, Chart.js, moment.js

#### **DOCTORS** (Simple-Moderate, 3 templates)

- **Folder:** `src/app/client/views/templates/doctors/`
- **Templates:**
  - `list/` (2 files) - DataTable with avatar, name, edit button
  - `form/` (2 files) - Doctor profile editing with AutoForm
  - `workHours/` (2 files) - Weekly work schedule editor
- **Complexity:** MODERATE - Form handling, work hours grid
- **Key Tech:** AutoForm, DataTables, iCheck (checkboxes)

#### **SPECIALTIES** (Simple, 2 templates)

- **Folder:** `src/app/client/views/templates/specialties/`
- **Templates:**
  - `list/` (2 files) - DataTable list
  - `form/` (2 files) - AutoForm for specialty CRUD
- **Complexity:** LOW - Standard CRUD form + list

#### **DRUGS** (Simple, 2 templates)

- **Folder:** `src/app/client/views/templates/drugs/`
- **Templates:**
  - `drug_list/` (2 files) - DataTable list
  - `drug_form/` (2 files) - AutoForm + Summernote HTML editor
- **Complexity:** LOW-MODERATE - Uses Summernote for drug description/instructions
- **Key Tech:** AutoForm, Summernote (WYSIWYG HTML editor)
- **Offline:** Subscribed at client startup via Ground.Collection

#### **ICD-10 DIAGNOSIS** (Simple, 1 template)

- **Folder:** `src/app/client/views/templates/icd10/`
- **Templates:**
  - `icd10_list/` (2 files) - Read-only table search (ICD codes + descriptions)
- **Complexity:** LOW - Static data lookup
- **Offline:** Ground.Collection (observeSource from server subscription)

#### **EXAM CATALOG** (Simple, 2 templates)

- **Folder:** `src/app/client/views/templates/exam-catalog/`
- **Templates:**
  - `list/` (2 files) - DataTable
  - `form/` (2 files) - AutoForm
- **Complexity:** LOW - Standard CRUD

#### **FORM MODELS** (Moderate-Complex, 2 templates, ~150 LOC)

- **Folder:** `src/app/client/views/templates/form-models/`
- **Templates:**
  - `list/` (2 files) - DataTable list
  - `form/` (2 files) - Form Builder + Form Renderer with JSON schema
- **Complexity:** MODERATE-HIGH - Drag-and-drop form builder
- **Key Tech:** formBuilder.js + formRender.js, jQuery UI Sortable, custom field restrictions
- **Features:**
  - Disabled fields: autocomplete, button, file, date
  - Control order: text, textarea, number, select
  - Save/cancel/delete buttons with SweetAlert
  - Preview tab with live rendering

#### **DOCUMENT MODELS** (Moderate, 2 templates)

- **Folder:** `src/app/client/views/templates/document-models/`
- **Templates:**
  - `list/` (2 files) - DataTable
  - `form/` (2 files) - Document template editor (similar to form models)
- **Complexity:** MODERATE - Document template creation/editing

#### **IMPORT/BULK OPERATIONS** (Complex, ~350 LOC)

- **Folder:** `src/app/client/views/templates/import/patients/`
- **Template:** `import.js` (2 files)
- **Description:** CSV patient import workflow with validation
  - Papa Parse for CSV parsing
  - State machine: idle → uploading → uploaded → testing → ready/withErrors → importing
  - Validation: Server-side test run before import
  - Error highlighting: DataTable rows + cells with tooltips (qTip)
  - Find/replace bulk string replacement
  - RTF/special character conversion helpers (convertToPlain, hex2a, convertSpecialChars)
  - Session-based buffer for import data
- **Complexity:** HIGH - Complex state management, data transformation, error reporting
- **Key Tech:** Papa Parse (CSV), jQuery qTip (tooltips), Session storage, DataTables

#### **USERS MANAGEMENT** (Complex, ~300 LOC)

- **Folder:** `src/app/client/views/templates/users/`
- **Template:** `users.js` (2 files)
- **Description:** User admin panel
  - DataTable of Meteor.users collection
  - Responsive form UI (side panel on desktop, full modal on mobile)
  - Profile editing: firstName, lastName, email, password, group, picture
  - Dual checkboxes: enabled status, super admin flag
  - Image upload (collection field)
  - iCheck for styled checkboxes
  - Device-aware layout (Meteor.Device.isPhone())
  - Form injection into modal on mobile
- **Complexity:** MODERATE-HIGH - Complex state management, device-aware layout
- **Key Tech:** iCheck, Meteor.Device API, Template.forEachCurrentlyRenderedInstance

#### **LOGIN** (Simple, 2 files, ~30 LOC)

- **Folder:** `src/app/client/views/templates/login/`
- **Description:** Accounts Templates overrides
  - Ladda button loading indicator
  - Pre-fill credentials for demo (hardcoded: leo.lima.web@gmail.com / 123456)
  - Autocomplete prevention
- **Complexity:** LOW
- **Key Tech:** Ladda.js, Accounts Templates (Meteor package)

#### **ACCOUNTS OVERRIDES** (1 folder, 2 HTML files)

- **Folder:** `src/app/client/views/templates/accounts-overrides/`
- **Templates:** `atPwdFormBtnOverride.html`, `atSelectInputOverride.html`
- **Description:** Custom styling/layout for Accounts-Templates forms

---

### 3. LAYOUT SYSTEM

**File:** `src/app/client/views/layouts/`

#### **Main Layout** (5 files total)

- **`main.html`** (31 lines) - Authenticated app shell
  - Responsive wrapper with sidebar + main content area
  - Dynamic template injection: `{{&gt;Template.dynamic template=content}}`
  - Subscription readiness check: `isReady` helper
  - Loading spinner display
  - Footer include
  - Include components: `navigation`, `topNavbar`, `footer`

- **`main.js`** (89 lines) - Layout logic
  - Responsive sidebar collapse on window resize (&lt;769px)
  - Dynamic min-height calculation for page wrapper based on navbar/wrapper heights
  - Fixed layout support
  - Body class management: `body-small` (mobile), `fixed-nav` (fixed sidebar)
  - Logout on page refresh (prevents stale sessions)
  - Commented-out skin/sidebar options

- **`blank.html`** (6 lines) - Minimal layout for public pages
  - Just content template injection
  - No navbar, sidebar, footer

- **`blank.js`** (minimal)

- **`globalHelpers.js`** - Template helpers (pagination, etc.)

---

### 4. CLIENT-SIDE LIBRARIES &amp; PLUGINS

**Total Plugins:** 20 distinct libraries

#### **jQuery Plugins** (in `src/app/client/plugins/`)

1. **blueimp** (jquery.blueimp-gallery.min.js) - Image gallery
2. **chosen** (chosen.jquery.js + chosenIcon.jquery.js) - Dropdown select enhancement
3. **clockpicker** (clockpicker.js) - Time picker
4. **dropdown-menu-effects** - Animated dropdown effects
5. **floating-action-button** (fab.js) - FAB UI component
6. **iCheck** (icheck.min.js) - Styled checkboxes/radios
7. **jquery-mobile** (jquery.mobile.custom.min.js) - Mobile UI framework
8. **jquery-ui** (jquery-ui.min.js) - Sortable, datepicker, resizable
9. **mask** (jquery.mask.js) - Input masking (phone, CPF, etc.)
10. **metisMenu** (jquery.metisMenu.js) - Collapsible menu
11. **pace** (pace.min.js) - Progress bar indicator
12. **qtip** (jquery.qtip.js) - Tooltips (validation errors, etc.)
13. **slimscroll** (jquery.slimscroll.js) - Custom scrollbar
14. **summernote** (summernote WYSIWYG) - Rich HTML editor
15. **sweetalert** - Alert/confirmation dialogs
16. **toastr** - Toast notifications

#### **Imported Libraries** (in `src/app/imports/`)

17. **bootstrap-toggle** - Toggle switches
18. **bootstrap-datepicker** - Date picker (with pt-BR, es locales)
19. **ladda** (ladda.min.js + spin.min.js) - Loading button indicator

#### **Major External Dependencies** (used in templates, likely from Meteor packages)

20. **Chart.js** - Bar/doughnut charts (dashboard, reports)
21. **FullCalendar Scheduler** - Appointment calendar (schedule feature)
22. **DataTables** - Server-side datatable component (tabular Meteor package)
23. **formBuilder.js** - Form template designer (form-models)
24. **formRender.js** - Form renderer
25. **Papa Parse** - CSV parser (import feature)
26. **Gravatar** - Profile image API
27. **moment.js** - Date/time utilities (locale-aware)
28. **Ground.Collection** - Offline-first collections (icd10, drugs)
29. **AutoForm** - Form generation + validation (patient, doctor, specialty, drug, exam, document forms)
30. **Meteor.Device** - Device detection API
31. **TAPi18n** / **T9n** - i18n translation (TAPi18next for Meteor)
32. **Blaze** - Template engine (Meteor's built-in)
33. **FlowRouter** - Routing
34. **BlazeLayout** - Layout rendering
35. **Accounts-Templates** - Authentication UI

---

### 5. INTERNATIONALIZATION (i18n)

**Framework:** TAPi18n (Meteor i18next adapter)

**Files:** `src/app/i18n/` contains **48 YAML files**

**Languages Supported:** 3

- **pt-BR** (Portuguese - Brazil) - Primary
- **en** (English)
- **es** (Spanish)

**Translation Catalogs per Feature:**

- `common.{lang}.i18n.yml` - Shared UI strings
- `dashboard.{lang}.i18n.yml` - Dashboard KPIs
- `doctors.{lang}.i18n.yml` - Doctor feature
- `drugs.{lang}.i18n.yml` - Drug catalog
- `exam-catalog.{lang}.i18n.yml` - Exam types
- `exam-results.{lang}.i18n.yml` - Exam display
- `patients.{lang}.i18n.yml` - Patient forms/lists
- `schedule.{lang}.i18n.yml` - Calendar appointments
- `specialties.{lang}.i18n.yml` - Medical specialties
- `users.{lang}.i18n.yml` - User management
- `form-builder.{lang}.i18n.yml` - Form model builder
- `patient-evolution.{lang}.i18n.yml` - Timeline
- `document-models.{lang}.i18n.yml` - Document templates
- Plus schema translations for collection fields

**Usage Patterns:**

- `TAPi18n.__('key')` - Direct translation
- `TAPi18n.__('key', param)` - With parameter interpolation
- `TAPi18n.getLanguage()` - Get current language code
- Chart.js labels, button text, validation messages all i18n-aware
- Moment.js locales set dynamically based on TAPi18n language

---

### 6. LOGIC DISTRIBUTION: TEMPLATE HELPERS vs. SERVER METHODS

#### **Template Helper Logic** (~60% of frontend logic)

Stateless data transformations and conditional rendering:

- **Data Fetching:** Collections.find() queries → DataTable/Chart.js data
- **Formatting:**
  - Date formatting: `moment(date).format("DD/MM/YYYY")`
  - Currency: `dashFormatBRL()` for BRL formatting
  - Age calculation: `ageFromDob(dob)`
- **Conditional Rendering:**
  - Status badges with icon/color mapping
  - Image URL selection (Gravatar vs. uploaded)
  - Form state (edit vs. create)
  - isMobile detection
- **Collection Aggregation:**
  - Patient table columns with custom render functions
  - Doctor resource list building with color assignment

#### **Template Event Handlers** (~25% of frontend logic)

User interactions with DOM and form submission:

- **Form Submission:** AutoForm hooks (onSuccess, onError)
- **Modal Interactions:** Show/hide, carousel navigation, button state toggling
- **DOM Manipulation:**
  - jQuery plugin initialization (Chosen, iCheck, Summernote, FullCalendar)
  - CSS class toggling (error states, loading states)
  - Modal form button creation (delete, cancel buttons)
  - DataTable row click → navigate
- **Complex Workflows:**
  - Schedule form modal carousel between patient selection and appointment editing
  - Import state machine (idle → uploading → testing → importing)
  - User form responsive layout injection (side panel ↔ modal)
- **Validation UI:**
  - qTip error tooltips on import errors
  - "has-error" class on invalid form groups

#### **Server Methods Called from Templates** (~15% of logic, but data-critical)

Business logic that must run server-side:

- **`dashboardStats`** - Aggregates KPI data (appointments by month, records by type, age groups, gender)
- **`patientImport`** / **`testPatientImport`** - CSV validation + bulk insert
- **`updateUser`** - User profile changes (password hashing, verification)
- **Schedule operations:** (likely `Schedule.insert/update/remove`)
- **Collection CRUD:** (likely Meteor methods for Patients, Drugs, Doctors, etc.)
- **`startAppointment`** / **`stopAppointment`** - Appointment lifecycle (creates/updates Schedule + Appointments collections)

---

### 7. KEY TECHNICAL OBSERVATIONS FOR MIGRATION

#### **Major Blocker Dependencies (Must Replace/Vendor)**

1. **FullCalendar Scheduler v4** - Complex calendar with resource scheduling, constraints, event rendering
   - Replacement options: tui-calendar, react-big-calendar, custom web component
   - High data-binding complexity (reactive event source callback)
2. **AutoForm** - Automatic form generation from Meteor schema collections
   - Replacement: Formik, React Hook Form, VanillaJS custom forms
3. **DataTables** (via tabular Meteor package) - Server-side processing, sorting, searching
   - Replacement: vanilla DataTables.net API, SortableJS
4. **formBuilder.js** - Drag-and-drop JSON form schema designer
   - Replacement: form-builder.io, Formio, custom React component
5. **TAPi18n** - i18next Meteor adapter
   - Replacement: i18next (standalone), use JSON instead of YAML
6. **Ground.Collection** - Offline-first persistence
   - Replacement: IndexedDB + simple storage API, or PouchDB
7. **Blaze/FlowRouter** - Template engine + routing (Meteor-specific)
   - Replacement: Vanilla HTML/JS or lightweight templating (Handlebars.js), History API

#### **jQuery Migration**

- 16+ jQuery plugins and 1000+ LOC of jQuery event/DOM manipulation
- Consider: Alpine.js (minimal footprint), htmx (server-free interactivity), or Vanilla JS + event delegation
- Heavy use of jQuery plugin ecosystem (iCheck, Chosen, Summernote, Ladda, qTip, Gravatar, etc.)

#### **CSS/HTML Generation**

- Heavy reliance on Bootstrap class generation via Spacebars (e.g., `Spacebars.SafeString(...)`)
- Modal creation via jQuery DOM injection (formbox, user edit modal)
- CSS class toggling for responsive behavior (body-small, col-sm-12 ↔ col-sm-8)

#### **Reactive Patterns**

- Meteor Tracker + ReactiveVar for state management
- Session object for page-level state (unsavedChanges, patientsBuffer)
- Subscriptions + data reactivity (onCreated/autorun/observe)
- High coupling to Meteor's reactivity model

#### **Offline Features**

- Ground.Collection for icd10 + drugs (2 large read-only collections)
- Cache subscribed data on client startup (observeSource + stopObserver after 60s)
- CSV import buffered in Session

#### **Accessibility &amp; Device Support**

- Meteor.Device.isPhone() for responsive form UI (modal on mobile, sidebar on desktop)
- iCheck for styled form controls
- FAB (floating action button) for mobile actions
- No aria-labels or WCAG compliance patterns observed

#### **Performance Considerations**

- FullCalendar Scheduler: large doctor + schedule collection queries per render
- DataTables: pagination/sorting (tabular package handles server-side)
- Multiple Chart.js instances (4 on dashboard, 2 on patient report)
- Heavy use of $(document).ready() and re-initialization on template render
- No lazy loading or code splitting observed

---

### 8. FEATURE COMPLEXITY RANKING

**TIER 1 - VERY HIGH COMPLEXITY** (Requires custom JS frameworks)

1. **Schedule** (540 LOC, FullCalendar Scheduler, resource scheduling, constraints, color coding)
2. **Patient Management** (260 LOC, complex forms, appointment lifecycle, image uploads)
3. **Form/Document Model Builder** (drag-and-drop JSON schema, formBuilder.js library)
4. **Import Workflow** (350 LOC, state machine, CSV parsing, validation error UI, bulk operations)

**TIER 2 - MODERATE COMPLEXITY** (Custom forms + charting/tables) 5. **Dashboard** (230 LOC, Chart.js, server aggregation, reactive updates) 6. **Reports** (240 LOC combined, DataTables, Chart.js) 7. **User Management** (300 LOC, responsive form, device-aware layout) 8. **Doctors + Specialties** (work hours grid, standard CRUD)

**TIER 3 - LOW COMPLEXITY** (Standard CRUD + lists) 9. **Drugs, ICD-10, Exam Catalog** (simple forms, read-only tables, offline data) 10. **Login** (Accounts-Templates customization)

---

### 9. SUMMARY STATISTICS

| Metric                      | Count                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| Total Routes                | 27+                                                                                           |
| Template Files              | 30 JS + 32 HTML = 62 total                                                                    |
| Total Frontend JS LOC       | ~1,257                                                                                        |
| i18n Files                  | 48 (3 languages × 16 feature catalogs)                                                        |
| Plugin/Library Dependencies | 35+                                                                                           |
| Layouts                     | 2 (main, blank)                                                                               |
| Offline Collections         | 2 (icd10, drugs)                                                                              |
| Chart.js Instances          | 4 per dashboard, 2 per patient report                                                         |
| Form Types                  | 11 (patient, doctor, drug, specialty, form-model, document-model, exam, settings, user, etc.) |
| Complex State Machines      | 2 (import workflow, schedule modal carousel)                                                  |
| Device-Aware Features       | 3 (user form, mobile nav collapse, body-small class)                                          |

---

### 10. RECOMMENDED MIGRATION SEQUENCE

1. **Phase 1: Static Pages &amp; Auth** (2-3 weeks)
   - Replace login/sign-up with static HTML + vanilla JS
   - Implement routing (History API)
   - Auth state management (localStorage/sessionStorage)

2. **Phase 2: CRUD Features** (4-6 weeks)
   - Drugs, ICD-10, Specialties, Exam Catalog (simple forms + tables)
   - Patient list → detail flow
   - Basic form handling without AutoForm

3. **Phase 3: Complex Forms** (3-4 weeks)
   - Patient form with image upload, appointment linking
   - Doctor/user management with responsive layout
   - Document/form model builders (formBuilder.js or custom)

4. **Phase 4: Data Visualization** (2-3 weeks)
   - Dashboard: Chart.js implementation
   - Reports: DataTables + charting

5. **Phase 5: Schedule** (4-6 weeks) - **HIGHEST EFFORT**
   - FullCalendar replacement (tui-calendar or custom calendar)
   - Resource scheduling, work hours constraints
   - Real-time event updates (WebSocket via IndexedDB polling)

6. **Phase 6: Import &amp; Advanced Features** (2-3 weeks)
   - CSV import with Papa Parse + validation
   - Appointment lifecycle (start/stop)

7. **Phase 7: PWA/Offline** (2-3 weeks)
   - Service Worker + IndexedDB for offline collections
   - Cache strategy for app shell

**Total Estimated Effort:** 20-30 weeks (5-7.5 months) for a junior team, or 10-15 weeks for experienced frontend developers.

---

This inventory provides the foundation for scope estimation. The migration complexity is **HIGH** due to FullCalendar Scheduler, AutoForm abstraction, heavy jQuery dependency, and Meteor's reactivity model. A **vanilla JS + lightweight framework** (Alpine.js + htmx) or **lightweight library** (Vue.js, Lit.js) would reduce migration time compared to a full React rewrite.
