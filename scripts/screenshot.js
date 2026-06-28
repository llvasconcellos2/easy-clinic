// Dev screenshot helper for the webdesign workflow.
//
// Drives a headless Chromium (Playwright) against the local Meteor dev server and
// saves desktop + mobile full-page PNGs into ./screenshots-dev/ (gitignored).
//
// This is a HOST-side dev tool — it talks to the Dockerized Meteor app over the
// port it publishes (http://localhost:3000). Playwright is installed from the
// repo-root package.json (`npm install` + `npx playwright install chromium`),
// NOT from src/app (that is the pinned Node-4 Meteor app and must stay untouched).
//
// Auth: almost every route is behind `AccountsTemplates.ensureSignedIn`. The login
// form lives at `/` (useraccounts atForm) and redirects to `/dashboard`. Set
// SCREENSHOT_USER / SCREENSHOT_PASS and the script logs in once before capturing.
// Public routes that need no login: `/` (login), `/privacy`, `/terms-of-use`.
//
// The seeded admin must be email-verified AND enabled to pass login
// (see scripts/README.md), e.g. in the mongo shell:
//   db.users.update({"emails.address":"leo.lima.web@gmail.com"},
//                   {$set:{"emails.$.verified":true,"isUserEnabled":true}})
//
// Usage (run from PowerShell, not Git Bash — MSYS mangles a leading-`/` arg):
//   node scripts/screenshot.js                         # /dashboard, label "dashboard"
//   node scripts/screenshot.js /patients patients      # <path> <label>
//   node scripts/screenshot.js /privacy privacy        # public page, no login needed
//   $env:SCREENSHOT_USER="leo.lima.web@gmail.com"; $env:SCREENSHOT_PASS="..."; \
//     node scripts/screenshot.js /schedule schedule
//
// Output: ./screenshots-dev/screenshot-<N>-<label>-<viewport>.png
// (N auto-increments; existing files are never overwritten.)

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = process.env.SCREENSHOT_BASE || "http://localhost:3000";
const OUT_DIR = path.resolve(process.cwd(), "screenshots-dev");

const USER = process.env.SCREENSHOT_USER || "";
const PASS = process.env.SCREENSHOT_PASS || "";

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844 },
];

function nextIndex() {
  if (!fs.existsSync(OUT_DIR)) return 1;
  const used = fs
    .readdirSync(OUT_DIR)
    .map((f) => /^screenshot-(\d+)-/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  return (used.length ? Math.max(...used) : 0) + 1;
}

// Log in through the useraccounts form at `/`. Meteor logs in over DDP
// (websocket) and FlowRouter redirects client-side to /dashboard — there is no
// full page navigation, so we wait for the authenticated shell to appear.
async function login(page) {
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.fill("#at-field-email", USER);
  await page.fill("#at-field-password", PASS);
  await page.click("#at-btn");
  await page.waitForSelector("nav.navbar-static-side", { timeout: 20000 });
}

(async () => {
  const route = process.argv[2] || "/dashboard";
  const label = (process.argv[3] || "dashboard").replace(/[^a-z0-9-]/gi, "-");
  const url = route.startsWith("http") ? route : BASE + route;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const n = nextIndex();

  const browser = await chromium.launch();
  // ignoreHTTPSErrors is harmless over http; kept in case BASE is pointed at an
  // https reverse-proxy with a self-signed cert.
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  if (USER && PASS) {
    await login(page);
  } else {
    console.warn(
      "no SCREENSHOT_USER/SCREENSHOT_PASS set — capturing without login " +
        "(authenticated routes will redirect to the sign-in page)."
    );
  }

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(url, { waitUntil: "load" });
    // Blaze renders reactive data after subscriptions arrive and pages enter
    // with an animate.css transition — give it a moment to settle.
    await page.waitForTimeout(1500);
    const out = path.join(OUT_DIR, `screenshot-${n}-${label}-${vp.label}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log("saved", path.relative(process.cwd(), out));
  }

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
