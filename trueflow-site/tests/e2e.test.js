/* End-to-end checks of the critical user flows with Playwright, against the site served over http
   the way Netlify serves it. Run: npm run test:e2e   (needs the `playwright` package and a Chromium build) */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { PAGES } = require("../scripts/pages.js");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg" };
let browser, server, BASE, posts = [];

before(async () => {
  server = http.createServer((req, res) => {
    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => { posts.push(body); res.writeHead(200); res.end("ok"); });
      return;
    }
    const rel = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(ROOT, rel === "/" ? "index.html" : rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  BASE = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch();
});
after(async () => { await browser.close(); server.close(); });

async function open(file = "index.html", viewport = { width: 1280, height: 900 }) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  // keep the tests offline: Google Fonts aren't needed to check behavior
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  // stand in for the Cloudflare analytics beacon; a CSP that blocked it would still log an error
  await page.route(/cloudflareinsights\.com/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await page.goto(BASE + file);
  return { page, errors: () => errors.filter((e) => !/fonts\.(googleapis|gstatic)|net::ERR_FAILED/.test(e)) };
}

test("every page loads with no script errors and no sideways scroll", async () => {
  for (const { file } of PAGES) {
    for (const width of [1280, 390]) {
      const { page, errors } = await open(file, { width, height: 900 });
      assert.deepEqual(errors(), [], file);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, `${file} at ${width}px`);
      await page.close();
    }
  }
});

test("nav marks the current page and the phone tab bar moves between pages", async () => {
  const { page } = await open("services.html", { width: 390, height: 800 });
  assert.equal(await page.getAttribute(".tabbar a[href='services.html']", "aria-current"), "page");
  assert.equal(await page.isVisible(".tabbar"), true);
  await page.click(".tabbar a[href='contact.html']");
  await page.waitForURL(/contact\.html$/);
  assert.equal(await page.isVisible("#reqForm"), true);
  await page.close();
});

test("home tiles link to each part of the site", async () => {
  const { page } = await open();
  const hrefs = await page.$$eval(".tile", (a) => a.map((x) => x.getAttribute("href")));
  assert.deepEqual(hrefs, ["tools.html", "services.html", "lab.html", "work.html", "area.html", "contact.html"]);
  assert.equal(await page.$$eval(".tile .tile-ico svg", (s) => s.length), 6);
  await page.close();
});

test("Water Lab reacts to the power source, depth, wind and herd", async () => {
  const { page } = await open("lab.html");
  const num = async (sel) => Number((await page.textContent(sel)).replace(/,/g, ""));
  assert.equal(await page.isVisible("#labWind"), true);
  assert.equal(await page.isVisible("#labSun"), false);
  const shallow = await num("#supplyOut");
  await page.fill("#labDepth", "600");
  assert.ok(await num("#supplyOut") < shallow, "a deeper well pumps less");
  await page.fill("#labWind", "2");
  assert.equal(await num("#supplyOut"), 0);
  assert.match(await page.textContent("#verdict"), /Falls short/);
  await page.click("#pw-solar");
  assert.equal(await page.getAttribute("#pw-solar", "aria-pressed"), "true");
  assert.equal(await page.isVisible("#labSun"), true);
  await page.click("#pw-electric");
  await page.fill("#labHerd", "100");
  assert.equal(await num("#needOut"), 1500);
  assert.match(await page.textContent("#verdict"), /room to spare/);
  assert.match(await page.textContent("#labTip"), /HP pump/);
  await page.click("#labBook");
  await page.waitForURL(/contact\.html\?need=c4$/);
  assert.equal(await page.isChecked("#c4"), true);
  await page.close();
});

test("symptom checker updates the ticket and Book this fix pre-fills the contact form", async () => {
  const { page } = await open("tools.html");
  await page.click(".symptom[data-i='2']");
  assert.equal(await page.textContent("#ticket h3"), "Short cycling");
  await page.click("#ticket a:has-text('Book this fix')");
  await page.waitForURL(/contact\.html\?/);
  assert.equal(await page.isChecked("#c3"), true);
  assert.match(await page.inputValue("#fMsg"), /Pump clicks on and off fast/);
  await page.close();
});

test("pump flow calculator responds to steppers and options", async () => {
  const { page } = await open("tools.html");
  assert.equal(await page.textContent("#gpmOut"), "10");
  await page.click("[data-step=bath][data-d='1']");
  await page.click("#xIrr");
  assert.equal(await page.textContent("#gpmOut"), "18");
  await page.close();
});

test("tank tab shows the pre-charge target", async () => {
  const { page } = await open("tools.html");
  await page.click("#tabTank");
  assert.equal(await page.isVisible("#panelTank"), true);
  await page.selectOption("#cutIn", "30");
  assert.equal(await page.textContent("#preOut"), "28");
  await page.close();
});

test("request form validates the phone number, then sends", async () => {
  const { page } = await open("contact.html");
  await page.fill("#fName", "Jo Smith");
  await page.fill("#fPhone", "555");
  await page.click("#reqForm [type=submit]");
  assert.match(await page.textContent("#formMsg"), /10 digits/);
  assert.equal(await page.getAttribute("#fPhone", "aria-invalid"), "true");
  await page.fill("#fPhone", "(806) 555-0101");
  await page.click("#reqForm [type=submit]");
  await page.waitForFunction(() => /Got it, Jo/.test(document.querySelector("#formMsg").textContent));
  await page.close();
});

test("mobile menu opens, navigates and closes", async () => {
  const { page } = await open("index.html", { width: 390, height: 800 });
  assert.equal(await page.isVisible("#drawer"), false);
  await page.click("#menuBtn");
  assert.equal(await page.getAttribute("#menuBtn", "aria-expanded"), "true");
  await page.click("#drawer a[href='about.html']");
  await page.waitForURL(/about\.html$/);
  assert.equal(await page.isVisible("#drawer"), false);
  await page.close();
});

test("service area checker answers for listed and unlisted towns", async () => {
  const { page } = await open("area.html");
  await page.fill("#zip", "hoxie");
  await page.press("#zip", "Enter");
  assert.match(await page.textContent("#zipOut"), /Hoxie is home base/);
  await page.fill("#zip", "colby");
  await page.press("#zip", "Enter");
  assert.match(await page.textContent("#zipOut"), /Colby is about 3\d miles from Hoxie/);
  await page.fill("#zip", "Elsewhere");
  await page.click("#zipBtn");
  assert.match(await page.textContent("#zipOut"), /isn't on this list/);
  await page.close();
});

test("contact shows the email and the area page shows the 100-mile radius", async () => {
  const { page } = await open("contact.html");
  assert.equal(await page.getAttribute("#mailLink", "href"), "mailto:trueflow2026@gmail.com");
  assert.equal(await page.textContent("#mailLink"), "trueflow2026@gmail.com");
  await page.goto(BASE + "area.html");
  assert.match(await page.textContent("[data-f=radius]"), /^100$/);
  await page.close();
});

test("sizing tabs work from the keyboard", async () => {
  const { page } = await open("tools.html");
  await page.focus("#tabFlow");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => document.activeElement.id), "tabTank");
  assert.equal(await page.isVisible("#panelTank"), true);
  assert.equal(await page.getAttribute("#tabFlow", "tabindex"), "-1");
  await page.close();
});

test("keyboard focus is visible on the tank slider", async () => {
  const { page } = await open("tools.html");
  await page.click("#tabTank");
  await page.focus("#cutIn");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "tankAir");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, "none");
  await page.close();
});

test("honeypot submissions are dropped without sending", async () => {
  const { page } = await open("contact.html");
  let posted = false;
  page.on("request", (r) => { if (r.method() === "POST") posted = true; });
  await page.fill("#fName", "Bot");
  await page.fill("#fPhone", "8065550101");
  await page.evaluate(() => { document.querySelector("#fGotcha").value = "spam"; });
  await page.click("#reqForm [type=submit]");
  assert.equal(posted, false);
  await page.close();
});

test("the form posts to Netlify Forms even though Netlify strips data-netlify", async () => {
  const { page } = await open("contact.html");
  await page.evaluate(() => document.querySelector("#reqForm").removeAttribute("data-netlify"));
  posts = [];
  await page.fill("#fName", "Jo Smith");
  await page.fill("#fPhone", "(806) 555-0101");
  await page.click("#reqForm [type=submit]");
  await page.waitForFunction(() => /Got it, Jo/.test(document.querySelector("#formMsg").textContent));
  const sent = new URLSearchParams(posts[0]);
  assert.equal(sent.get("form-name"), "service-request");
  assert.equal(sent.get("name"), "Jo Smith");
  assert.equal(sent.get("phone"), "(806) 555-0101");
  await page.close();
});

test("job photos open in a lightbox and step through", async () => {
  const { page } = await open("work.html");
  await page.click("[data-photo='0']");
  assert.equal(await page.isVisible("#lightbox"), true);
  assert.match(await page.textContent("#lbCap"), /\(1 of \d+\)/);
  await page.keyboard.press("ArrowRight");
  assert.match(await page.textContent("#lbCap"), /\(2 of \d+\)/);
  await page.keyboard.press("Escape");
  assert.equal(await page.isVisible("#lightbox"), false);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.photo), "0");
  await page.close();
});

test("windmill symptom books the windmill or solar option", async () => {
  const { page } = await open("tools.html");
  await page.click(".symptom[data-i='6']");
  assert.equal(await page.textContent("#ticket h3"), "Windmill pump isn't lifting");
  await page.click("#ticket a:has-text('Book this fix')");
  await page.waitForURL(/contact\.html\?/);
  assert.equal(await page.isChecked("#c6"), true);
  await page.close();
});

test("all job photos load", async () => {
  const { page } = await open("work.html");
  await page.evaluate(() => document.querySelectorAll("#gallery img").forEach((i) => { i.loading = "eager"; }));
  await page.waitForFunction(() => [...document.querySelectorAll("#gallery img")].every((i) => i.complete));
  const broken = await page.evaluate(() => [...document.querySelectorAll("img")].filter((i) => i.src && i.complete && i.naturalWidth === 0).map((i) => i.src));
  assert.deepEqual(broken, []);
  await page.close();
});

test("Water Lab sim plays out a month and says how the herd did", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com|cloudflareinsights\.com/, (r) => r.abort());
  await page.goto(BASE + "lab.html");
  assert.equal(await page.isVisible("#simBoard"), false);
  await page.fill("#labWind", "2"); // no wind: the tank runs dry and cattle are lost
  await page.click("#simRun");
  assert.equal(await page.locator("#simDays li").count(), 30);
  await page.waitForSelector("#simResult b");
  assert.match(await page.textContent("#simResult"), /You lost cattle/);
  assert.equal(await page.textContent("#simLabel"), "Run it again");
  await page.fill("#labWind", "12"); // changing a setting clears the old run
  assert.equal(await page.isVisible("#simBoard"), false);
  await page.click("#an-chickens"); // chickens: own slider range and wording
  assert.equal(await page.textContent("#herdLabel"), "Chickens");
  assert.equal(await page.textContent("#herdVal"), "1,000 birds");
  assert.equal(await page.getAttribute("#labHerd", "max"), "10000");
  await page.fill("#labWind", "2");
  await page.click("#simRun");
  await page.waitForSelector("#simResult b");
  assert.match(await page.textContent("#simResult"), /You lost chickens/);
  await page.check("#labHouseToo");
  await page.fill("#labHerd", "0"); // no animals: nothing to simulate, even with the house drawing water
  assert.equal(await page.isDisabled("#simRun"), true);
  assert.deepEqual(errors, []);
  await page.close();
});

async function openSim(hash) {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com|cloudflareinsights\.com/, (r) => r.abort());
  await page.goto(BASE + "lab.html" + hash);
  return { page, errors };
}

test("Water Lab picker switches between the four sims and remembers the choice in the URL", async () => {
  const { page, errors } = await openSim("");
  assert.equal(await page.isVisible("#lab"), true);
  for (const [mode, panel] of [["pivot", "#labPivot"], ["irrigation", "#labIrrigation"], ["house", "#labHouse"]]) {
    await page.click("#mode-" + mode);
    assert.equal(await page.isVisible(panel), true, mode);
    assert.equal(await page.isVisible("#lab"), false, mode);
    assert.equal(await page.getAttribute("#mode-" + mode, "aria-pressed"), "true");
    assert.equal(await page.evaluate(() => location.hash), "#" + mode);
  }
  await page.click("#mode-livestock");
  assert.equal(await page.isVisible("#lab"), true);
  await page.evaluate(() => { location.hash = "#irrigation"; }); // a same-page link switches too
  await page.waitForSelector("#labIrrigation", { state: "visible" });
  assert.deepEqual(errors, []);
  await page.close();
});

test("Pivot sim: more water per acre helps, and a run ends with a verdict", async () => {
  const { page, errors } = await openSim("#pivot");
  const num = async (sel) => Number(await page.textContent(sel));
  const base = await num("#pvPutOut");
  await page.fill("#pvGpm", "1200");
  assert.ok(await num("#pvPutOut") > base, "a bigger pivot puts down more");
  await page.fill("#pvAcres", "160");
  await page.fill("#pvGpm", "200");
  await page.selectOption("#pvWeather", "hot");
  await page.selectOption("#pvSoil", "sandy");
  await page.click("#pvRun");
  await page.waitForSelector("#pvResult b");
  assert.ok((await page.textContent("#pvResult b")).length > 0);
  assert.deepEqual(errors, []);
  await page.close();
});

test("Irrigation sim: a thin aquifer pumps down and burns up the pump", async () => {
  const { page, errors } = await openSim("#irrigation");
  await page.fill("#iwSat", "40");
  await page.click("#iwRun");
  await page.waitForSelector("#iwResult b");
  assert.match(await page.textContent("#iwResult b"), /toast/i);
  await page.fill("#iwSat", "200"); // changing a setting clears the old run
  assert.equal(await page.isVisible("#iwBoard"), false);
  assert.deepEqual(errors, []);
  await page.close();
});

test("House well sim: a weak well with a big family and a sprinkler runs dry; a good setup gets strong showers", async () => {
  const { page, errors } = await openSim("#house");
  await page.fill("#hwPeople", "8");
  await page.fill("#hwWell", "1");
  await page.click("#hwSprinkler");
  await page.click("#hwRun");
  await page.waitForSelector("#hwResult b");
  assert.match(await page.getAttribute("#hwResult", "class"), /\blost\b/);
  await page.fill("#hwPeople", "2");
  assert.equal(await page.isVisible("#hwBoard"), false, "changing a setting clears the old run");
  await page.click("#hwSprinkler");
  await page.fill("#hwWell", "20");
  await page.fill("#hwPump", "20");
  await page.fill("#hwTank", "120");
  await page.click("#hwRun");
  await page.waitForSelector("#hwResult b");
  assert.match(await page.getAttribute("#hwResult", "class"), /\bthrived\b/);
  assert.deepEqual(errors, []);
  await page.close();
});
