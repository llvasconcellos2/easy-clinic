// Route-by-route render sweep of the rip/ static build.
// Logs in through the splash, visits every route in rip/shim/router.js, and reports
// console/page errors, content size, route-specific render signals, and any inline
// error box the router renders when a page init throws.
//
//   node src/scripts/verify-rip-routes.js          (rip served at http://localhost:8081)
//   RIP_BASE=http://host:port node src/scripts/verify-rip-routes.js
//
// Mutations only touch the browser's in-memory store; nothing on disk changes.

const { chromium } = require("playwright");

const BASE = process.env.RIP_BASE || "http://localhost:8081";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console] " + m.text()); });
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("requestfailed", (r) => errors.push("[reqfail] " + r.url()));
  page.on("response", (r) => { if (r.status() >= 400) errors.push("[http " + r.status() + "] " + r.url()); });

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // login splash (fake login) — display check; offsetParent is null for fixed elements
  const hasSplash = await page.evaluate(() => {
    const el = document.getElementById("login-splash");
    return el && getComputedStyle(el).display !== "none";
  });
  if (hasSplash) {
    await page.click("#login-btn");
    await page.waitForSelector("#page-content", { timeout: 15000 });
    await page.waitForTimeout(1500);
  }

  await page.waitForFunction(() => window.Patients && window.Patients.find({}).count() > 0, { timeout: 15000 })
    .catch(() => errors.push("[fatal] store never loaded"));

  // real ids for the edit routes
  const ids = await page.evaluate(() => ({
    patient: (Patients.findOne({}) || {})._id,
    drug: (Drugs.findOne({}) || {})._id,
    specialty: (Specialties.findOne({}) || {})._id,
    examCatalog: ((window.ExamCatalog && ExamCatalog.findOne({})) || {})._id,
    doctor: (Meteor.users.findOne({ "profile.group": "medical_doctor" }) || {})._id,
    documentModel: ((window.DocumentModels && DocumentModels.findOne({})) || {})._id,
    formModel: ((window.FormModels && FormModels.findOne({})) || {})._id,
    currentUserId: Meteor.userId(),
    scheduleTotal: window.Schedule ? Schedule.find({}).count() : -1,
    scheduleForCurrentUser: window.Schedule ? Schedule.find({ resourceId: Meteor.userId() }).count() : -1,
  }));
  console.log("IDS: " + JSON.stringify(ids, null, 2));
  console.log("BOOT ERRORS: " + (errors.length ? "\n  " + errors.join("\n  ") : "(none)"));

  const routes = [
    { hash: "#/dashboard", name: "dashboard", check: () => ({
        kpiPatients: (document.getElementById("kpi-patients") || {}).textContent,
        kpiBilling: (document.getElementById("kpi-billing") || {}).textContent,
        agendaText: ((document.getElementById("schedule-timeline") || {}).textContent || "").trim().slice(0, 80),
        charts: ["dash-appts", "dash-records", "dash-age", "dash-gender"].map((id) => !!document.getElementById(id)),
      }) },
    { hash: "#/patients", name: "patientList", check: () => ({ rows: document.querySelectorAll("#page-content table tbody tr").length }) },
    { hash: "#/patients/create", name: "patientCreate", check: () => ({ inputs: document.querySelectorAll("#page-content form input").length }) },
    { hash: "#/patients/" + ids.patient, name: "patientEdit", wait: 2500, check: () => ({
        nameVal: (document.querySelector("#page-content [name='name']") || {}).value,
        tabs: document.querySelectorAll("#page-content .nav-tabs li").length }) },
    { hash: "#/schedule", name: "schedule", wait: 3000, check: () => ({
        fcView: !!document.querySelector(".fc-view"),
        resources: document.querySelectorAll(".fc-resource-area tr[data-resource-id]").length,
        events: document.querySelectorAll(".fc-event").length }) },
    { hash: "#/doctors", name: "doctorList", check: () => ({ rows: document.querySelectorAll("#page-content table tbody tr").length }) },
    { hash: "#/doctors/" + ids.doctor, name: "doctorEdit", wait: 2500, check: () => ({
        summernote: !!document.querySelector("#page-content .note-editor"),
        chosen: document.querySelectorAll("#page-content .chosen-container").length }) },
    { hash: "#/drugs", name: "drugList", check: () => ({ rows: document.querySelectorAll("#page-content table tbody tr").length }) },
    { hash: "#/drugs/create", name: "drugCreate", check: () => ({ summernote: !!document.querySelector("#page-content .note-editor") }) },
    { hash: "#/drugs/" + ids.drug, name: "drugEdit", check: () => ({
        summernote: !!document.querySelector("#page-content .note-editor"),
        nameVal: (document.querySelector("#page-content [name='name']") || {}).value }) },
    { hash: "#/icd10", name: "icd10List", check: () => ({ rows: document.querySelectorAll("#page-content table tbody tr").length }) },
    { hash: "#/specialties", name: "specialtyList", check: () => ({ rows: document.querySelectorAll("#page-content table tbody tr").length }) },
    { hash: "#/specialties/create", name: "specialtyCreate", check: () => ({ inputs: document.querySelectorAll("#page-content form input").length }) },
    { hash: "#/specialties/" + ids.specialty, name: "specialtyEdit", check: () => ({
        nameVal: (document.querySelector("#page-content input[name='name']") || {}).value }) },
    { hash: "#/exam-catalog", name: "examCatalogList", check: () => ({ rows: document.querySelectorAll("#page-content table tbody tr").length }) },
    { hash: "#/exam-catalog/" + ids.examCatalog, name: "examCatalogEdit", check: () => ({
        nameVal: (document.querySelector("#page-content input[name='name']") || {}).value }) },
    { hash: "#/document-models", name: "documentModelList", check: () => ({ rows: document.querySelectorAll("#page-content table tbody tr").length }) },
    { hash: "#/document-models/" + ids.documentModel, name: "documentModelEdit", check: () => ({
        summernote: !!document.querySelector("#page-content .note-editor"),
        chosen: document.querySelectorAll("#page-content .chosen-container").length }) },
    { hash: "#/form-models", name: "formModelsList", check: () => ({ rows: document.querySelectorAll("#page-content table tbody tr").length }) },
    { hash: "#/form-models/create", name: "formModelsCreate", wait: 3000, check: () => ({
        formBuilder: !!document.querySelector("#page-content .form-builder, #page-content .frmb") }) },
    { hash: "#/form-models/" + ids.formModel, name: "formModelsEdit", wait: 3000, check: () => ({
        formBuilder: !!document.querySelector("#page-content .form-builder, #page-content .frmb") }) },
    { hash: "#/reports/appointments", name: "reportAppointments", wait: 2500, check: () => ({ rows: document.querySelectorAll("#page-content table tbody tr").length }) },
    { hash: "#/reports/patients", name: "reportPatients", wait: 2500, check: () => ({
        rows: document.querySelectorAll("#page-content table tbody tr").length, canvases: document.querySelectorAll("#page-content canvas").length }) },
    { hash: "#/reports/production", name: "reportProduction", wait: 2500, check: () => ({
        canvases: document.querySelectorAll("#page-content canvas").length }) },
    { hash: "#/settings", name: "settingsForm", check: () => ({ inputs: document.querySelectorAll("#page-content form input").length }) },
    { hash: "#/users", name: "users", check: () => ({ rows: document.querySelectorAll("#page-content table tbody tr").length }) },
    { hash: "#/import", name: "import", check: () => ({ fileInput: !!document.querySelector("#page-content input[type='file']") }) },
  ];

  let failures = 0;
  for (const r of routes) {
    errors = [];
    await page.evaluate((h) => { location.hash = h; }, r.hash);
    await page.waitForTimeout(r.wait || 1500);
    let checks = {};
    try { checks = await page.evaluate(r.check); } catch (e) { checks = { evalError: e.message }; }
    // the router swallows page-init exceptions into an inline error box — surface it
    const inlineError = await page.evaluate(() =>
      ((document.querySelector("#page-content .ibox-content > p.text-danger") || {}).textContent || "").trim());
    const contentLen = await page.evaluate(() => (document.getElementById("page-content") || { innerHTML: "" }).innerHTML.length);
    const bad = errors.length > 0 || inlineError || contentLen < 300;
    if (bad) failures++;
    console.log("\n=== " + (bad ? "FAIL " : "ok   ") + r.name + " (" + r.hash + ") contentLen=" + contentLen);
    console.log("  checks: " + JSON.stringify(checks));
    if (inlineError) console.log("  INLINE ERROR BOX: " + inlineError);
    if (errors.length) console.log("  ERRORS:\n    " + errors.join("\n    "));
  }

  console.log("\n" + (failures ? failures + " route(s) failed" : "all routes rendered"));
  await browser.close();
  process.exit(failures ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
