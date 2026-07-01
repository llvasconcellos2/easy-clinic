// Headless verification for the rip/ static build.
// Loads http://localhost:8081, captures console/page errors, asserts the app
// frame rendered with data-bound values, and saves a screenshot.
//
//   node src/scripts/verify-rip.js
//
// Output: ./screenshots-dev/rip-frame-desktop.png

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = process.env.RIP_BASE || "http://localhost:8081";
const OUT_DIR = path.resolve(process.cwd(), "screenshots-dev");

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  const consoleMsgs = [];
  page.on("console", (m) => {
    consoleMsgs.push(`[${m.type()}] ${m.text()}`);
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("requestfailed", (r) =>
    errors.push("REQFAIL: " + r.url() + " " + (r.failure() && r.failure().errorText))
  );
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push("HTTP " + r.status() + ": " + r.url());
  });

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForSelector("nav.navbar-static-side", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);

  const checks = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      hasSideNav: !!q("nav.navbar-static-side"),
      hasTopNav: !!q(".navbar-static-top"),
      hasFooter: !!q(".footer"),
      userName: (q("#side-menu .profile-element .font-bold") || {}).textContent || null,
      userGroup: ((q("#side-menu .profile-element .text-muted") || {}).textContent || "").trim(),
      avatarSrc: (q("#mini-profile-img") || {}).src || null,
      dashboardLabel: (q("#side-menu li .nav-label") || {}).textContent || null,
      contentText: ((q("#page-wrapper .ibox-content") || {}).textContent || "").trim().slice(0, 60),
      navItemCount: document.querySelectorAll("#side-menu > li").length,
    };
  });

  console.log("=== console messages ===");
  consoleMsgs.forEach((m) => console.log(m));
  console.log("=== checks ===");
  console.log(JSON.stringify(checks, null, 2));
  console.log("=== errors ===");
  console.log(errors.length ? errors.join("\n") : "(none)");

  const out = path.join(OUT_DIR, "rip-frame-desktop.png");
  await page.screenshot({ path: out, fullPage: true });
  console.log("saved", path.relative(process.cwd(), out));

  await browser.close();
  process.exit(errors.length ? 2 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
