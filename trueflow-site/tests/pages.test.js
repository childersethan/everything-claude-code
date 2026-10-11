/* The committed pages must match src/ (run `npm run pages` if this fails). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { build, PAGES } = require("../scripts/pages.js");

test("committed pages are up to date with src/", () => {
  for (const [file, html] of Object.entries(build())) {
    assert.equal(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), html, file);
  }
});

test("each page has its own title and canonical URL", () => {
  const out = build();
  const titles = new Set(PAGES.map((p) => out[p.file].match(/<title>(.*?)<\/title>/)[1]));
  assert.equal(titles.size, PAGES.length);
  assert.match(out["services.html"], /<link rel="canonical" href="https:\/\/trueflowpumpandwell.com\/services.html">/);
  assert.match(out["index.html"], /<link rel="canonical" href="https:\/\/trueflowpumpandwell.com\/">/);
});

test("no page repeats an id (a repeat makes getElementById pick the wrong element)", () => {
  for (const [file, html] of Object.entries(build())) {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const repeats = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(repeats, [], file);
  }
});
