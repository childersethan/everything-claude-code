/* End-to-end checks of the critical user flows with Playwright.
   Run: npm run test:e2e   (needs the `playwright` package and a Chromium build) */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const URL = "file://" + path.resolve(__dirname, "..", "index.html");
let browser;

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

async function open(viewport = { width: 1280, height: 900 }) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL);
  return { page, errors };
}

test("page loads with no script errors and no sideways scroll", async () => {
  for (const width of [1280, 390]) {
    const { page, errors } = await open({ width, height: 900 });
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.close();
  }
});

test("symptom checker updates the ticket and pre-fills the form", async () => {
  const { page } = await open();
  await page.click(".symptom[data-i='2']");
  assert.equal(await page.textContent("#ticket h3"), "Short cycling");
  await page.click("#bookFix");
  assert.equal(await page.isChecked("#c3"), true);
  assert.match(await page.inputValue("#fMsg"), /Pump clicks on and off fast/);
  await page.close();
});

test("pump flow calculator responds to steppers and options", async () => {
  const { page } = await open();
  assert.equal(await page.textContent("#gpmOut"), "10");
  await page.click("[data-step=bath][data-d='1']");
  await page.click("#xIrr");
  assert.equal(await page.textContent("#gpmOut"), "18");
  await page.close();
});

test("tank tab shows the pre-charge target", async () => {
  const { page } = await open();
  await page.click("#tabTank");
  assert.equal(await page.isVisible("#panelTank"), true);
  await page.selectOption("#cutIn", "30");
  assert.equal(await page.textContent("#preOut"), "28");
  await page.close();
});

test("request form validates the phone number", async () => {
  const { page } = await open();
  await page.fill("#fName", "Jo Smith");
  await page.fill("#fPhone", "555");
  await page.click("#reqForm [type=submit]");
  assert.match(await page.textContent("#formMsg"), /10 digits/);
  assert.equal(await page.getAttribute("#fPhone", "aria-invalid"), "true");
  await page.fill("#fPhone", "(806) 555-0101");
  await page.click("#reqForm [type=submit]");
  assert.match(await page.textContent("#formMsg"), /Thanks, Jo/);
  await page.close();
});

test("mobile menu opens, navigates and closes", async () => {
  const { page } = await open({ width: 390, height: 800 });
  assert.equal(await page.isVisible("#drawer"), false);
  await page.click("#menuBtn");
  assert.equal(await page.getAttribute("#menuBtn", "aria-expanded"), "true");
  await page.click("#drawer a[href='#sizing']");
  assert.equal(await page.isVisible("#drawer"), false);
  await page.close();
});

test("service area checker answers for listed and unlisted towns", async () => {
  const { page } = await open();
  await page.fill("#zip", "town b");
  await page.press("#zip", "Enter");
  assert.match(await page.textContent("#zipOut"), /Yes, we're in Town B/);
  await page.fill("#zip", "Elsewhere");
  await page.click("#zipBtn");
  assert.match(await page.textContent("#zipOut"), /isn't on our usual list/);
  await page.close();
});

test("Book this fix keeps what the visitor already typed", async () => {
  const { page } = await open();
  await page.fill("#fMsg", "Started last night");
  await page.click(".symptom[data-i='0']");
  await page.click("#bookFix");
  assert.equal(await page.inputValue("#fMsg"), "No water at all. Started last night");
  await page.close();
});

test("sizing tabs work from the keyboard", async () => {
  const { page } = await open();
  await page.focus("#tabFlow");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => document.activeElement.id), "tabTank");
  assert.equal(await page.isVisible("#panelTank"), true);
  assert.equal(await page.getAttribute("#tabFlow", "tabindex"), "-1");
  await page.close();
});

test("keyboard focus is visible on the tank slider", async () => {
  const { page } = await open();
  await page.click("#tabTank");
  await page.focus("#cutIn");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "tankAir");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, "none");
  await page.close();
});

test("honeypot submissions are dropped without sending", async () => {
  const { page } = await open();
  let posted = false;
  page.on("request", (r) => { if (r.method() === "POST") posted = true; });
  await page.fill("#fName", "Bot");
  await page.fill("#fPhone", "8065550101");
  await page.evaluate(() => { document.querySelector("#fGotcha").value = "spam"; });
  await page.click("#reqForm [type=submit]");
  assert.equal(posted, false);
  await page.close();
});
