const { test } = require("node:test");
const assert = require("node:assert/strict");
const L = require("../js/lab.js");

test("windFactor: nothing below 6 mph, about 62% at 10 and 80% at 12, full at 15, eases off once the mill furls", () => {
  assert.equal(L.windFactor(3), 0);
  assert.ok(Math.abs(L.windFactor(10) - 0.62) < 0.001);
  assert.ok(Math.abs(L.windFactor(12) - 0.77) < 0.02);
  assert.equal(L.windFactor(15), 1);
  assert.equal(L.windFactor(20), 1);
  assert.equal(L.windFactor(28), 0.7);
  assert.ok(L.windFactor(10) > 0 && L.windFactor(10) < 1);
});

test("demand: gallons per head by weather, plus the house", () => {
  assert.equal(L.demand({ herd: 100, season: "mild" }), 1500);
  assert.equal(L.demand({ herd: 100, season: "hot", house: true }), 2300);
  assert.equal(L.demand({ herd: 9999, season: "cool" }), 4000); // herd clamps to 400
  assert.throws(() => L.demand({ herd: 10, season: "monsoon" }), /Unknown season/);
  assert.throws(() => L.demand({ herd: 10, animal: "llamas" }), /Unknown animal/);
});

test("supply: a deeper well pumps less for windmill and solar", () => {
  for (const power of ["windmill", "solar"]) {
    const shallow = L.supply({ power, depth: 100 }).galPerDay;
    const deep = L.supply({ power, depth: 500 }).galPerDay;
    assert.ok(shallow > deep, `${power}: ${shallow} should beat ${deep}`);
  }
  assert.equal(L.supply({ power: "windmill", depth: 150, wind: 2 }).galPerDay, 0);
  assert.equal(L.supply({ power: "windmill", depth: 150, wind: 15 }).galPerDay, 190 * 16); // 2" cylinder, full wind
  assert.throws(() => L.supply({ power: "hamster", depth: 100 }), /Unknown power source/);
});

test("supply: a bigger windmill cylinder pumps more but can't lift as deep (8 ft Aermotor chart)", () => {
  const at = (depth, size) => L.supply({ power: "windmill", depth, wind: 15, size });
  assert.deepEqual([0, 1, 2].map((size) => at(60, size).gpm.toFixed(1)), ["3.2", "5.4", "7.8"]);
  assert.deepEqual([0, 1, 2].map((size) => at(60, size).lift), [164, 111, 80]);
  assert.equal(at(100, 2).tooDeep, true); // a 3" cylinder tops out around 80 ft
  assert.equal(at(100, 2).galPerDay, 0);
  assert.equal(at(100, 1).tooDeep, undefined);
  assert.match(L.tooDeepText(at(200, 0)), /2" cylinder on an 8 ft windmill only lifts about 164 ft/);
  const stalled = L.simulate({ power: "windmill", size: 2, depth: 200, herd: 60, season: "mild" }, 1);
  assert.equal(stalled.outcome.level, "lost");
  assert.match(stalled.days[0].note, /Too deep/);
});

test("supply: electric and solar come in sizes, and the bigger one pumps more", () => {
  assert.deepEqual([0, 1, 2].map((size) => L.supply({ power: "electric", depth: 120, size }).gpm), [5, 10, 20]);
  assert.equal(L.supply({ power: "electric", depth: 120 }).gpm, 10); // medium by default
  assert.deepEqual([0, 1, 2].map((size) => L.supply({ power: "solar", depth: 100, size }).gpm), [3, 6, 10]);
  assert.equal(L.supply({ power: "windmill", depth: 120 }).label, '2" cylinder'); // smallest cylinder by default
});

test("supply: electric picks a standard motor size that grows with depth", () => {
  const shallow = L.supply({ power: "electric", depth: 100 });
  const deep = L.supply({ power: "electric", depth: 600 });
  assert.equal(shallow.galPerDay, 14400);
  assert.ok(deep.hp > shallow.hp);
  assert.ok([0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10].includes(deep.hp));
});

test("verdict: plenty, just enough, or short with the gap", () => {
  assert.equal(L.verdict(2000, 1000).level, "ok");
  assert.equal(L.verdict(1100, 1000).level, "close");
  const v = L.verdict(600, 1600);
  assert.equal(v.level, "short");
  assert.match(v.text, /1,000 gallons/);
  assert.equal(L.verdict(500, 0).level, "ok");
});

const SETUP = { power: "windmill", depth: 120, wind: 12, sun: 5.5, herd: 60, season: "mild", house: false };
const tally = (setup, runs = 100) => {
  const c = { thrived: 0, tight: 0, thirsty: 0, lost: 0 };
  for (let seed = 1; seed <= runs; seed++) c[L.simulate(setup, seed).outcome.level]++;
  return c;
};

test("simulate: plays out 30 days and the same seed replays the same month", () => {
  const a = L.simulate(SETUP, 42), b = L.simulate(SETUP, 42);
  assert.equal(a.days.length, L.SIM_DAYS);
  assert.deepEqual(a, b);
  for (const d of a.days) {
    assert.ok(d.tank >= 0 && d.tank <= a.storage, `day ${d.day} tank ${d.tank}`);
    assert.ok(["clear", "calm", "heat"].includes(d.weather));
  }
});

test("simulate: no wind means a dry tank and lost cattle", () => {
  const run = L.simulate({ ...SETUP, wind: 2 }, 3);
  assert.equal(run.outcome.level, "lost");
  assert.ok(run.outcome.lostShare > 0);
  assert.match(run.outcome.title, /You lost cattle/);
  assert.match(run.outcome.text, /didn't make it/);
});

test("simulate: a well with plenty to spare usually thrives, a short one usually loses cattle", () => {
  const big = tally({ ...SETUP, power: "electric", herd: 100 });
  assert.ok(big.thrived >= 90, JSON.stringify(big));
  const short = tally({ ...SETUP, power: "solar", size: 0, herd: 100 });
  assert.ok(short.lost >= 90, JSON.stringify(short));
});

test("simulate: storms only hit electric, clouds only solar", () => {
  const kinds = (power) => new Set(Array.from({ length: 50 }, (_, i) => L.simulate({ ...SETUP, power }, i + 1).days.map((d) => d.weather)).flat());
  assert.ok(kinds("electric").has("storm") && !kinds("electric").has("cloudy"));
  assert.ok(kinds("solar").has("cloudy") && !kinds("solar").has("storm"));
  assert.throws(() => L.simulate({ ...SETUP, power: "hamster" }), /Unknown power source/);
});

test("goats and chickens drink far less than cattle, and the sim speaks their language", () => {
  assert.equal(L.demand({ herd: 100, season: "mild", animal: "goats" }), 150);
  assert.equal(L.demand({ herd: 1000, season: "hot", animal: "chickens" }), 120);
  assert.equal(L.demand({ herd: 99999, season: "cool", animal: "chickens" }), 500); // flock clamps to 10,000
  const goats = L.simulate({ ...SETUP, animal: "goats", herd: 400, wind: 2 }, 5).outcome;
  assert.equal(goats.title, "You lost goats.");
  const hens = L.simulate({ ...SETUP, animal: "chickens", herd: 1000 }, 5).outcome;
  assert.match(hens.title, /flock/);
});
