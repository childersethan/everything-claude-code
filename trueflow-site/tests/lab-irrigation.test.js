const { test } = require("node:test");
const assert = require("node:assert/strict");
const L = require("../js/lab-irrigation.js");

const SETUP = { sat: 120, gpm: 800, pivots: 1, dtw: 180, weather: "mild" };
const tally = (setup, runs = 100) => {
  const c = { thrived: 0, tight: 0, thirsty: 0, lost: 0 };
  for (let seed = 1; seed <= runs; seed++) c[L.simulate(setup, seed).outcome.level]++;
  return c;
};

test("wellYield: about 8 gpm per foot of saturated thickness, capped", () => {
  assert.equal(L.wellYield(120), 960);
  assert.equal(L.wellYield(40), 320);
  assert.equal(L.wellYield(250), 1800);
  assert.equal(L.wellYield(5), 160); // clamps to the 20 ft minimum
  assert.ok(L.specificCapacity(120) > 11 && L.specificCapacity(120) < 13);
  assert.equal(L.available(120), 120 - L.INTAKE_FT);
});

test("horsepower: more water or a deeper lift takes a bigger standard motor", () => {
  const base = L.horsepower(800, 260);
  assert.ok(Math.abs(base.hp - (800 * 330) / (3960 * 0.7)) < 0.01);
  assert.equal(base.motor, 100);
  assert.ok(L.horsepower(1500, 260).motor > base.motor);
  assert.ok(L.horsepower(800, 450).motor > base.motor);
  assert.ok(L.powerBill(100, 1) > L.powerBill(100, 0.5));
  assert.equal(L.powerBill(100, 0), 0);
});

test("margin: a harder pump, a worn-down season or a dropping water table all leave less water over the intake", () => {
  const fresh = L.margin(120, 800, { stress: 0 });
  assert.ok(L.margin(120, 1000, { stress: 0 }) < fresh);
  assert.ok(L.margin(120, 800, { stress: 1 }) < fresh);
  assert.ok(L.margin(120, 800, { stress: 0, regional: 10 }) === fresh - 10);
  assert.equal(L.margin(120, 0), L.available(120));
});

test("outlook and verdict: the default holds; a thin aquifer sucks air; two pivots outrun one pump", () => {
  const o = L.outlook(SETUP);
  assert.equal(o.yield, 960);
  assert.equal(o.peak, 850);
  assert.ok(o.left > 15 && o.left < 30, `left ${o.left}`);
  assert.equal(o.motor, 100);
  assert.equal(L.verdict(SETUP).level, "ok");
  const thin = L.verdict({ ...SETUP, sat: 40 });
  assert.equal(thin.level, "short");
  assert.match(thin.text, /suck air/);
  const two = L.verdict({ ...SETUP, pivots: 2 });
  assert.equal(two.level, "short");
  assert.match(two.text, /2 pivots want about 1,700 gpm/);
  assert.equal(L.verdict({ ...SETUP, sat: 250, gpm: 900 }).level, "ok");
  assert.throws(() => L.outlook({ ...SETUP, weather: "monsoon" }), /Unknown weather/);
});

test("simulate: 16 weeks, June to September, and the same seed replays the same summer", () => {
  const a = L.simulate(SETUP, 42), b = L.simulate(SETUP, 42);
  assert.equal(a.weeks.length, L.WEEKS);
  assert.deepEqual(a, b);
  assert.equal(a.weeks[0].date, "Jun 1");
  assert.equal(a.weeks[15].date, "Sep 14");
  for (const w of a.weeks) {
    assert.ok(w.level >= 0 && w.level <= 1, `week ${w.week} level ${w.level}`);
    assert.ok(["rain", "cool", "normal", "hot", "heat"].includes(w.weather));
    assert.ok(w.q <= SETUP.gpm);
  }
  // the neighbors keep pulling the water table down all summer
  assert.ok(a.weeks[15].regional > a.weeks[0].regional);
  // rain weeks rest the well: the pivots shut off
  const wet = Array.from({ length: 30 }, (_, i) => L.simulate(SETUP, i + 1).weeks).flat().filter((w) => w.weather === "rain");
  assert.ok(wet.length > 0 && wet.every((w) => w.q === 0));
});

test("simulate: the default well usually thrives and never burns up", () => {
  const c = tally(SETUP);
  assert.ok(c.thrived + c.tight >= 95, JSON.stringify(c));
  assert.ok(c.thrived >= 80, JSON.stringify(c));
  assert.equal(c.lost, 0);
});

test("simulate: a thin aquifer pumps down, sucks air and burns up the pump", () => {
  const c = tally({ ...SETUP, sat: 40 });
  assert.equal(c.lost, 100);
  const run = L.simulate({ ...SETUP, sat: 60 }, 3);
  assert.equal(run.outcome.level, "lost");
  assert.match(run.outcome.title, /KA-CHUNK/);
  const dead = run.weeks.findIndex((w) => w.dead);
  assert.ok(run.weeks[dead].air);
  assert.ok(run.weeks.slice(dead).every((w) => w.dead && w.level === 0 && w.delivered === 0));
});

test("simulate: two pivots on one 800 gpm pump short the corn, but the well holds", () => {
  const c = tally({ ...SETUP, pivots: 2 });
  assert.equal(c.thirsty, 100);
  const o = L.simulate({ ...SETUP, pivots: 2 }, 7).outcome;
  assert.match(o.text, /only covered \d+%/);
  assert.ok(o.share < 0.85);
});

test("simulate: a pump bigger than the well gives gets throttled back, and makes it, barely", () => {
  const c = tally({ ...SETUP, gpm: 1200 });
  assert.ok(c.tight >= 90, JSON.stringify(c));
  const run = L.simulate({ ...SETUP, gpm: 1200 }, 5);
  assert.ok(run.weeks.some((w) => w.cut && w.q < 1200));
  assert.match(run.outcome.text, /throttled back/);
});

test("simulate: a drought summer is harder on the well than a cool one", () => {
  const low = (weather) => Array.from({ length: 40 }, (_, i) => Math.min(...L.simulate({ ...SETUP, weather }, i + 1).weeks.map((w) => w.left))).reduce((a, b) => a + b) / 40;
  assert.ok(low("drought") < low("cool"));
  const sat80 = tally({ ...SETUP, sat: 80, weather: "drought" });
  assert.ok(sat80.lost > tally({ ...SETUP, sat: 80, weather: "cool" }).lost, JSON.stringify(sat80));
});
