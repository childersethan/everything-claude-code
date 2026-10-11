const { test } = require("node:test");
const assert = require("node:assert/strict");
const H = require("../js/lab-house.js");

const tally = (setup, runs = 60) => {
  const c = { thrived: 0, tight: 0, thirsty: 0, lost: 0 };
  for (let seed = 1; seed <= runs; seed++) c[H.simulate(setup, seed).outcome.level]++;
  return c;
};

test("clock: hours read like a farmer says them", () => {
  assert.equal(H.clock(0), "12 AM");
  assert.equal(H.clock(5), "5 AM");
  assert.equal(H.clock(12), "12 PM");
  assert.equal(H.clock(21), "9 PM");
  assert.equal(H.clock(29), "5 AM"); // wraps past midnight
});

test("normalize: sliders clamp and extras become true or false", () => {
  assert.deepEqual(H.normalize({ people: 99, well: 0, pump: 50, tank: 5, sprinkler: 1 }),
    { people: 8, well: 1, pump: 20, tank: 20, sprinkler: true, garden: false });
  assert.deepEqual(H.normalize(), { ...H.DEFAULTS });
});

test("drawdown: a 40/60 tank gives up about 27% of its size", () => {
  assert.ok(Math.abs(H.drawdown(44) - 11.88) < 0.01);
  assert.equal(H.drawdown(1000), H.drawdown(120));
});

test("rush: two bathrooms from three people up; the sprinkler makes the evening the busy one", () => {
  assert.equal(H.bathrooms(2), 1);
  assert.equal(H.bathrooms(3), 2);
  const plain = H.rush({ people: 4 });
  assert.equal(plain.when, "morning");
  assert.equal(plain.gpm, 8.1); // 2 showers x 2.5 + kitchen sink 1.5 + a flush 1.6
  const wet = H.rush({ people: 4, sprinkler: true });
  assert.equal(wet.when, "evening");
  assert.ok(wet.gpm > plain.gpm);
  assert.equal(H.rush({ people: 1 }).gpm, 4); // one shower and the sink, nobody else to flush
});

test("simulate: 24 hours from 5 AM, the same seed replays the same day", () => {
  const a = H.simulate(H.DEFAULTS, 42), b = H.simulate(H.DEFAULTS, 42);
  assert.deepEqual(a, b);
  assert.equal(a.hours.length, 24);
  assert.equal(a.hours[0].label, "5 AM");
  assert.equal(a.hours[23].label, "4 AM");
  for (const x of a.hours) {
    assert.ok(x.tank >= 0 && x.tank <= 1 && x.casing >= 0 && x.casing <= 1, x.label);
    assert.ok(x.minPsi <= 60 && x.minPsi >= 0, x.label);
  }
  assert.ok(a.hours.slice(1, 4).some((x) => x.showers > 0), "a morning shower rush");
  assert.ok(a.gallons > 150 && a.gallons < 400, `a family of four uses ${a.gallons} gal`);
});

test("simulate: the default house almost always keeps strong showers", () => {
  const c = tally(H.DEFAULTS);
  assert.ok(c.thrived >= 57, JSON.stringify(c));
});

test("simulate: a sprinkler during evening showers on a small pump makes pressure sag", () => {
  const c = tally({ ...H.DEFAULTS, sprinkler: true, pump: 7 });
  assert.ok(c.tight >= 50, JSON.stringify(c));
  const run = H.simulate({ ...H.DEFAULTS, sprinkler: true, pump: 7 }, 1);
  assert.match(run.outcome.title, /sag/);
});

test("simulate: a 5 gpm pump with the sprinkler going gives someone a cold trickle", () => {
  const c = tally({ ...H.DEFAULTS, sprinkler: true, pump: 5 });
  assert.ok(c.thirsty >= 30, JSON.stringify(c));
  const seed = Array.from({ length: 60 }, (_, i) => i + 1).find((s) => H.simulate({ ...H.DEFAULTS, sprinkler: true, pump: 5 }, s).outcome.level === "thirsty");
  const o = H.simulate({ ...H.DEFAULTS, sprinkler: true, pump: 5 }, seed).outcome;
  assert.equal(o.title, "Cold trickle!");
  assert.match(o.text, /psi/);
});

test("simulate: a 2 gpm well can't feed a 10 gpm pump and a sprinkler; it runs dry", () => {
  const setup = { ...H.DEFAULTS, sprinkler: true, well: 2 };
  const c = tally(setup);
  assert.equal(c.lost, 60, JSON.stringify(c));
  const run = H.simulate(setup, 3);
  assert.equal(run.outcome.title, "The well ran dry.");
  assert.match(run.outcome.text, /sprinkler/);
  assert.ok(run.hours.some((x) => x.dry));
});

test("simulate: a well that out-gives the pump never runs dry", () => {
  const c = tally({ people: 8, well: 20, pump: 10, tank: 44, sprinkler: true, garden: true });
  assert.equal(c.lost, 0, JSON.stringify(c));
});

test("assess: plain-words verdicts and tips that fit the setup", () => {
  const ok = H.assess(H.DEFAULTS);
  assert.equal(ok.level, "ok");
  assert.equal(ok.pump, 10);
  const dry = H.assess({ ...H.DEFAULTS, sprinkler: true, well: 2 });
  assert.equal(dry.level, "short");
  assert.match(dry.text, /suck the casing dry/);
  const trickle = H.assess({ ...H.DEFAULTS, sprinkler: true, pump: 5 });
  assert.equal(trickle.level, "short");
  assert.match(trickle.text, /trickle/);
  assert.match(H.assess({ ...H.DEFAULTS, tank: 20, pump: 14 }).tip, /short-cycle/);
  assert.match(H.assess({ ...H.DEFAULTS, well: 2 }).tip, /casing/);
});
