// Interaction-level tests for the rip/ static build — the "Must verify" list from
// docs/NoBackendVersion.md: store update/remove semantics, CRUD save/edit/delete,
// schedule modal + status transition, users edit panel, CSV import preview,
// patient create, deep-linking before login, and persist-mode boot.
//
//   node src/scripts/verify-rip-flows.js           (rip served at http://localhost:8081)
//
// All mutations hit the browser's in-memory store only; a reload resets them.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const BASE = process.env.RIP_BASE || "http://localhost:8081";
const results = [];
const ok = (name, pass, detail) => results.push({ name, pass, detail });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  const login = async () => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.click("#login-btn");
    await page.waitForSelector("#page-content", { timeout: 15000 });
    await page.waitForFunction(() => window.Patients && Patients.find({}).count() > 0, { timeout: 15000 });
  };
  const go = async (hash, wait) => {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.waitForTimeout(wait || 1500);
  };

  // ---- deep-link before login: splash shows, then routes to the hash ----
  errors = [];
  await page.goto(BASE + "/#/patients", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const deepErrs = errors.slice();
  await page.click("#login-btn");
  await page.waitForTimeout(2500);
  const deep = await page.evaluate(() => ({
    hash: location.hash, rows: document.querySelectorAll("#page-content table tbody tr").length }));
  ok("deep-link #/patients before login", deepErrs.length === 0 && deep.rows > 0, JSON.stringify({ deepErrs, deep }));

  // ---- store semantics: string-id update/remove must affect exactly one doc ----
  await login();
  const store = await page.evaluate(() => {
    const before = Specialties.find({}).count();
    const target = Specialties.findOne({});
    Specialties.update(target._id, { $set: { name: "___STRUPD___" } });
    const renamed = Specialties.find({ name: "___STRUPD___" }).count();
    const victim = Specialties.find({}).fetch()[1];
    Specialties.remove(victim._id);
    return { before, renamed, after: Specialties.find({}).count() };
  });
  ok("store: string-id update affects only 1 doc", store.renamed === 1, JSON.stringify(store));
  ok("store: string-id remove removes only 1 doc", store.after === store.before - 1, JSON.stringify(store));

  // ---- specialty CRUD (representative of the shared CRUD form pattern) ----
  await login(); // reset store
  errors = [];
  await go("#/specialties/create");
  await page.fill("#specialty-name", "Teste Verify");
  const specBefore = await page.evaluate(() => Specialties.find({}).count());
  await page.click("#specialtyForm button[type='submit']");
  await page.waitForTimeout(1200);
  const specCreated = await page.evaluate(() => ({
    count: Specialties.find({}).count(), doc: Specialties.findOne({ name: "Teste Verify" }), hash: location.hash }));
  ok("specialty create", specCreated.count === specBefore + 1 && !!specCreated.doc,
     JSON.stringify({ specBefore, count: specCreated.count, hash: specCreated.hash, errs: errors }));

  if (specCreated.doc) {
    errors = [];
    await go("#/specialties/" + specCreated.doc._id);
    const prefill = await page.evaluate(() => document.getElementById("specialty-name").value);
    await page.fill("#specialty-name", "Teste Editado");
    await page.click("#specialtyForm button[type='submit']");
    await page.waitForTimeout(1200);
    const upd = await page.evaluate(() => ({
      renamed: Specialties.find({ name: "Teste Editado" }).count(), total: Specialties.find({}).count() }));
    ok("specialty edit prefill + update (only 1 doc)", prefill === "Teste Verify" && upd.renamed === 1,
       JSON.stringify({ prefill, ...upd, errs: errors }));

    errors = [];
    await go("#/specialties/" + specCreated.doc._id);
    await page.click("#specialty-delete-btn");
    await page.waitForTimeout(800);
    await page.evaluate(() => { $(".sweet-alert button.confirm").trigger("click"); });
    await page.waitForTimeout(1200);
    const del = await page.evaluate((id) => ({
      stillThere: !!Specialties.findOne({ _id: id }), total: Specialties.find({}).count() }), specCreated.doc._id);
    ok("specialty delete removes only 1 doc", !del.stillThere && del.total === specBefore,
       JSON.stringify({ ...del, expectedTotal: specBefore, errs: errors }));
  }

  // ---- schedule: events visible, modal opens, status transition saves ----
  errors = [];
  await go("#/schedule", 3500);
  const evInfo = await page.evaluate(() => {
    const ev = Schedule.findOne({ patient: { $exists: true } });
    return ev ? { id: ev._id, start: ev.start.toISOString(), title: ev.title } : null;
  });
  if (evInfo) {
    await page.evaluate((d) => { $("#calendar").fullCalendar("gotoDate", moment(d)); }, evInfo.start);
    await page.waitForTimeout(2000);
    const sched = await page.evaluate(() => ({
      events: document.querySelectorAll(".fc-event").length,
      resources: document.querySelectorAll(".fc-resource-area tr[data-resource-id]").length }));
    ok("schedule shows events on their date", sched.events > 0, JSON.stringify({ evInfo, ...sched, errs: errors }));

    // today's view should not be empty in a healthy demo dataset
    const todayEvents = await page.evaluate(() => {
      const now = new Date();
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return Schedule.find({ start: { $gte: s, $lt: e } }).count();
    });
    ok("schedule has events dated today (demo freshness)", todayEvents > 0, "events today: " + todayEvents);

    if (sched.events > 0) {
      errors = [];
      await page.evaluate((title) => {
        const $ev = $(".fc-event").filter(function () { return $(this).text().indexOf(title) >= 0; });
        ($ev.length ? $ev : $(".fc-event")).first().trigger("click");
      }, evInfo.title);
      await page.waitForTimeout(1500);
      const modal = await page.evaluate(() => ({
        visible: $("#scheduleEventForm").is(":visible"),
        patientVal: $(".patients-chosen-select").val() }));
      ok("schedule event modal opens with patient preselected", modal.visible && !!modal.patientVal, JSON.stringify(modal));

      if (modal.visible) {
        errors = [];
        const evId = await page.evaluate(() => $("#schedule-form [name='eventId']").val());
        await page.evaluate(() => {
          const $r = $("#schedule-form input[name='status'][value='attending']");
          $r.prop("checked", true).closest("label").addClass("active").siblings().removeClass("active");
        });
        // jQuery trigger: a pinned qtip event-tooltip can sit under the headless
        // cursor and block native hit-testing (a real mouse move dismisses it)
        await page.evaluate(() => { $(".qtip").hide(); $("#scheduleEventForm .save").trigger("click"); });
        await page.waitForTimeout(1200);
        const saved = await page.evaluate((id) => ({
          status: (Schedule.findOne({ _id: id }) || {}).status,
          total: Schedule.find({}).count(),
          modalStillOpen: $("#scheduleEventForm").is(":visible") }), evId);
        ok("schedule status transition saves (only 1 event)", saved.status === "attending" && !saved.modalStillOpen,
           JSON.stringify({ evId, ...saved, errs: errors }));
      }
    }
  } else {
    ok("schedule shows events on their date", false, "Schedule collection empty");
  }
  await page.evaluate(() => { $(".modal-backdrop").remove(); $("body").removeClass("modal-open"); });

  // ---- user-reported repro: new appointment today shows on the dashboard agenda ----
  errors = [];
  await go("#/schedule", 3500);
  const repro = await page.evaluate(() => {
    // find a free slot today inside the logged-in doctor's work hours
    const me = Meteor.userId();
    const doc = Meteor.users.findOne({ _id: me });
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayHours = (doc.workHours || {})[today.getDay()] || [];
    const slotMins = (Settings.findOne({}) || {}).slotDuration || 20;
    const hm = (s) => { const p = String(s).split(":"); return new Date(today.getFullYear(), today.getMonth(), today.getDate(), +p[0], +p[1]); };
    for (const iv of dayHours) {
      for (let t = hm(iv.start); t < hm(iv.end); t = new Date(t.getTime() + slotMins * 60000)) {
        const end = new Date(t.getTime() + slotMins * 60000);
        const busy = Schedule.find({ resourceId: me }).fetch()
          .some((ev) => ev.start < end && ev.end > t);
        if (!busy) return { slot: t.toISOString(), me };
      }
    }
    return { slot: null, me };
  });
  if (repro.slot) {
    const prevIds = await page.evaluate(() => Schedule.find({}).fetch().map((e) => e._id));
    // drive the calendar's own select path (same as dragging a slot)
    await page.evaluate((r) => {
      $("#calendar").fullCalendar("select", moment(r.slot), null, r.me);
    }, repro);
    await page.waitForTimeout(1500);
    const modalOpen = await page.evaluate(() => $("#scheduleEventForm").is(":visible"));
    let reproResult = { modalOpen };
    if (modalOpen) {
      reproResult = await page.evaluate((prev) => {
        const pat = Patients.findOne({});
        $(".patients-chosen-select").val(pat._id).trigger("chosen:updated");
        $("#scheduleEventForm .save").trigger("click");
        // the event the select handler inserted = the one id not present before
        const prevSet = {};
        prev.forEach((id) => { prevSet[id] = 1; });
        const ev = Schedule.find({}).fetch().find((e) => !prevSet[e._id]);
        return { modalOpen: true, patName: pat.name,
                 saved: ev ? { patient: ev.patient, status: ev.status, startIsDate: ev.start instanceof Date } : null };
      }, prevIds);
      await page.evaluate(() => { $(".modal-backdrop").remove(); $("body").removeClass("modal-open"); });
      await go("#/dashboard", 2500);
      const agenda = await page.evaluate(() => (document.getElementById("schedule-timeline") || {}).textContent || "");
      const shown = reproResult.patName && agenda.indexOf(reproResult.patName) >= 0;
      ok("REPRO: new appointment today appears on dashboard agenda",
         !!(reproResult.saved && reproResult.saved.startIsDate && shown),
         JSON.stringify({ ...reproResult, agendaHasPatient: shown, errs: errors.slice(0, 3) }));
    } else {
      ok("REPRO: new appointment today appears on dashboard agenda", false, "select did not open the modal");
    }
  } else {
    ok("REPRO: new appointment today appears on dashboard agenda", false, "no free slot found today for current doctor");
  }

  // ---- users inline edit panel ----
  errors = [];
  await go("#/users", 2000);
  const editBtn = await page.$("#page-content table tbody tr .btn, #page-content table tbody tr a");
  if (editBtn) { await editBtn.click(); await page.waitForTimeout(1200); }
  const userPanel = await page.evaluate(() => ({
    forms: document.querySelectorAll("#page-content form").length,
    inputs: document.querySelectorAll("#page-content form input").length }));
  ok("users inline edit panel opens", userPanel.forms > 0 && userPanel.inputs > 0, JSON.stringify({ ...userPanel, errs: errors }));

  // ---- import: CSV parse + preview ----
  errors = [];
  const csvPath = path.join(os.tmpdir(), "rip-import-test.csv");
  fs.writeFileSync(csvPath, "name,email,cpf,dateOfBirth,gender,mobile\nPaciente Teste CSV,teste@example.com,52998224725,10/05/1990,M,(11) 98888-7777\n");
  await go("#/import", 1500);
  const fileInput = await page.$("#page-content input[type='file']");
  if (fileInput) {
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(2000);
    const preview = await page.evaluate(() => ({
      previewRows: document.querySelectorAll("#page-content table tbody tr").length }));
    ok("import CSV parse + preview", preview.previewRows > 0, JSON.stringify({ ...preview, errs: errors }));
  } else {
    ok("import CSV parse + preview", false, "no file input found");
  }

  // ---- patient create (all required fields) ----
  errors = [];
  await go("#/patients/create", 2000);
  const patBefore = await page.evaluate(() => Patients.find({}).count());
  await page.evaluate(() => {
    $("#insertPatientForm [name='name']").val("Paciente Verify").trigger("change");
    $("#insertPatientForm [name='dateOfBirth']").val("01/01/1990").trigger("change");
    $("#insertPatientForm [name='gender']").val("M").trigger("change");
    $("#insertPatientForm [name='mobile']").val("(11) 99999-9999").trigger("change");
  });
  await page.click("#insertPatientForm button[type='submit']");
  await page.waitForTimeout(1800);
  const pat = await page.evaluate(() => ({
    count: Patients.find({}).count(), doc: !!Patients.findOne({ name: "Paciente Verify" }), hash: location.hash }));
  ok("patient create", pat.count === patBefore + 1 && pat.doc, JSON.stringify({ patBefore, ...pat, errs: errors.slice(0, 3) }));

  // ---- persist mode boots and seeds ----
  errors = [];
  await page.goto(BASE + "/?persist=1", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const persist = await page.evaluate(() => ({
    persistExists: typeof Persistence !== "undefined",
    patients: window.Patients ? Patients.find({}).count() : -1 }));
  ok("persist=1 boots + seeds", persist.patients > 0, JSON.stringify({ ...persist, errs: errors.slice(0, 5) }));

  console.log("\n==== RESULTS ====");
  let failures = 0;
  results.forEach((r) => {
    if (!r.pass) failures++;
    console.log((r.pass ? "PASS " : "FAIL ") + r.name + "\n      " + r.detail);
  });
  console.log("\n" + (failures ? failures + " flow(s) failed" : "all flows passed"));
  await browser.close();
  process.exit(failures ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
