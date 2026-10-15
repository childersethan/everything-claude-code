/* Builds the site's pages (index.html, services.html, ...) from src/layout.html and src/pages/*.html,
   so the header, tab bar and footer stay identical on every page.
   Edit files in src/, then run:  npm run pages
   The output is plain HTML and is committed, so Netlify still needs no build step. */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://trueflowpumpandwell.com/";

// Order here is the order in the nav (pages with `nav: false` are left out). `tab` pages also appear in the phone tab bar.
const PAGES = [
  { key: "home", file: "index.html", label: "Home", tab: "house",
    title: "True Flow Pump & Well | Water Wells, Pumps & Windmills · Hoxie, KS",
    description: "True Flow Pump & Well serves farmers and ranchers around Hoxie, Kansas with water well installation, pump repair, windmill and solar systems, irrigation wells, trenching and plumbing. 24-hour service, call or text any hour." },
  { key: "services", file: "services.html", label: "Services", tab: "pump",
    title: "Services | True Flow Pump & Well",
    description: "Well installation, pump installation and repair, windmill service, solar wells, irrigation wells, house wells, cattle tanks, pressure tanks, trenching and leak repair around Hoxie, Kansas." },
  { key: "tools", file: "tools.html", label: "Diagnose", tab: "dial",
    title: "Diagnose & Size Your Water System | True Flow Pump & Well",
    description: "Pick your water symptom to see likely causes and urgency, and size your pump flow and pressure tank pre-charge in a few taps." },
  { key: "lab", file: "lab.html", label: "Water Lab", tab: "flask",
    title: "Water Lab: Livestock, Irrigation and House Well Sims | True Flow Pump & Well",
    description: "Pick a pump size and see if it keeps up: a livestock well, an irrigation well or a house well, with rule-of-thumb numbers from True Flow Pump & Well." },
  { key: "work", file: "work.html", label: "Our work", tab: "camera",
    title: "Our Work | True Flow Pump & Well",
    description: "Photos of windmill repairs, solar wells, stock tanks and water line work by True Flow Pump & Well." },
  { key: "about", file: "about.html", label: "About",
    title: "About | True Flow Pump & Well",
    description: "True Flow Pump & Well is based in Hoxie, Kansas: 24-hour service, free estimates, licensed and insured, for homes, farms and ranches." },
  { key: "area", file: "area.html", label: "Service area",
    title: "Service Area: 100 Miles Around Hoxie, KS | True Flow Pump & Well",
    description: "True Flow Pump & Well covers homes, farms and ranches within about 100 miles of Hoxie, Kansas, including Colby, Oakley, Hill City, Norton, Oberlin, Goodland, WaKeeney and Hays." },
  { key: "contact", file: "contact.html", label: "Contact", tab: "phone",
    title: "Contact & Request Service | True Flow Pump & Well",
    description: "Call or text any hour, email trueflow2026@gmail.com, or send a service request online." },
  { key: "privacy", file: "privacy.html", label: "Privacy", nav: false,
    title: "Privacy Policy | True Flow Pump & Well",
    description: "What information the True Flow Pump & Well website collects, why, who handles it, and how to ask us to see, correct or delete it." }
];

// Small line icons for the phone tab bar (static markup).
const TAB_ICONS = {
  house: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>',
  pump: '<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M8 9h8M8 13h8"/>',
  dial: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>'
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const current = (p, page) => (p.key === page.key ? ' aria-current="page"' : "");

function render(page, layout, body) {
  const inNav = PAGES.filter((p) => p.nav !== false);
  const nav = inNav.map((p) => `      <a href="${p.file}"${current(p, page)}>${p.label}</a>`).join("\n");
  const footnav = PAGES.filter((p) => p.nav !== false && p.key !== "home").map((p) => `      <a href="${p.file}">${p.label}</a>`).join("\n");
  const drawer = inNav.map((p) => `    <a href="${p.file}"${current(p, page)}>${p.label}</a>`).join("\n");
  const tabbar = PAGES.filter((p) => p.tab).map((p) =>
    `  <a href="${p.file}"${current(p, page)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TAB_ICONS[p.tab]}</svg><span>${p.label}</span></a>`).join("\n");
  const vars = {
    title: esc(page.title), description: esc(page.description), url: SITE_URL + (page.file === "index.html" ? "" : page.file),
    page: page.key, nav, drawer, footnav, tabbar, body: body.trimEnd()
  };
  return layout.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`Unknown placeholder ${m}`);
    return vars[k];
  });
}

/** Returns { file: html } for every page. */
function build() {
  const layout = fs.readFileSync(path.join(ROOT, "src/layout.html"), "utf8");
  const out = {};
  for (const page of PAGES) {
    out[page.file] = render(page, layout, fs.readFileSync(path.join(ROOT, `src/pages/${page.key}.html`), "utf8"));
  }
  return out;
}

if (require.main === module) {
  for (const [file, html] of Object.entries(build())) fs.writeFileSync(path.join(ROOT, file), html);
  console.log(`Wrote ${PAGES.length} pages`);
}

module.exports = { build, PAGES, SITE_URL };
