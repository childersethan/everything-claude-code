const { test } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../js/lab-pivot.js");

const SETUP = { crop: "corn", acres: 125, gpm: 800, weather: "mild", soil: "loam" };
const tally = (setup, runs = 100) => {
  const c = { thrived: 0, tight: 0, thirsty: 0, lost: 0 };
  for (let seed = 1; seed <= runs; seed++) c[P.simulate(setup, seed).outcome.level]++;
  return c;
};

test("applied: gallons a minute spread over the circle, less 15% lost to drift", () => {
  // 800 gpm on 125 acres: 800 x 1440 / (27,154 x 125) = 0.339 in gross, 0.288 in net
  assert.ok(Math.abs(P.applied(SETUP) - 0.288) < 0.001);
  assert.ok(P.applied({ gpm: 1200, acres: 60 }) > P.applied({ gpm: 1200, acres: 160 }));
  assert.equal(P.applied({ gpm: 99999, acres: 125 }), P.applied({ gpm: 1200, acres: 125 })); // clamps to the slider range
  assert.equal(P.gpmPerAcre(SETUP), 6.4);
});

test("cropUse: peak water use by crop and weather", () => {
  assert.equal(P.cropUse({ crop: "corn", weather: "hot" }), 0.33);
  assert.equal(P.cropUse({ crop: "alfalfa", weather: "mild" }), 0.27);
  for (const crop of Object.keys(P.CROPS)) {
    const [cool, mild, hot] = P.WEATHERS.map((weather) => P.cropUse({ crop, weather }));
    assert.ok(cool < mild && mild < hot, crop);
  }
  assert.throws(() => P.cropUse({ crop: "kale" }), /Unknown crop/);
  assert.throws(() => P.cropUse({ crop: "corn", weather: "monsoon" }), /Unknown weather/);
});

test("verdict: ahead, just keeping up, or falling behind with the gap", () => {
  assert.equal(P.verdict(0.3, 0.2).level, "ok");
  assert.equal(P.verdict(0.26, 0.25).level, "close");
  const v = P.verdict(0.29, 0.33);
  assert.equal(v.level, "short");
  assert.match(v.text, /0\.04 in a day/);
  assert.match(v.text, /1\.2 inches/);
});

test("simulate: plays out 30 days and the same seed replays the same month", () => {
  const a = P.simulate(SETUP, 42), b = P.simulate(SETUP, 42);
  assert.equal(a.days.length, P.SIM_DAYS);
  assert.deepEqual(a, b);
  for (const d of a.days) {
    assert.ok(d.soil >= 0 && d.soil <= a.cap, `day ${d.day} soil ${d.soil}`);
    assert.ok(d.cond >= 0 && d.cond <= 1);
    assert.ok(["clear", "storm", "heat", "windy", "broke"].includes(d.kind));
    if (d.kind === "broke") assert.equal(d.water, 0);
    if (d.rain > 0) assert.ok(d.rain >= 0.3 && d.rain <= 1.5);
  }
  assert.throws(() => P.simulate({ ...SETUP, soil: "gravel" }), /Unknown soil/);
});

test("simulate: the default quarter-section pivot usually brings in a bumper crop", () => {
  const c = tally(SETUP);
  assert.ok(c.thrived >= 90, JSON.stringify(c));
  assert.equal(c.lost, 0);
});

test("simulate: a tiny well under corn in summer heat burns the crop up", () => {
  const c = tally({ ...SETUP, gpm: 200, weather: "hot" });
  assert.ok(c.lost >= 80 && c.thrived === 0, JSON.stringify(c));
  const run = P.simulate({ ...SETUP, gpm: 200, weather: "hot" }, 3);
  assert.equal(run.outcome.level, "lost");
  assert.match(run.outcome.title, /burned up/);
  assert.match(run.outcome.text, /bone dry \d+ days in a row/);
});

test("simulate: a month of summer heat on 800 gpm leaves some corn thirsty; 600 gpm struggles; more water or a hardier crop fixes it", () => {
  // K-State: about 0.25 in a day (roughly 600 gpm on 125 acres) carries corn through most summers, not a whole month of heat
  const hot = tally({ ...SETUP, weather: "hot" });
  assert.ok(hot.thirsty + hot.lost > 20 && hot.lost < 5, JSON.stringify(hot));
  const lean = tally({ ...SETUP, weather: "hot", gpm: 600 });
  assert.ok(lean.thirsty + lean.lost > 50, JSON.stringify(lean));
  assert.ok(tally({ ...SETUP, gpm: 600 }).thrived >= 85, "600 gpm gets corn through a mild month");
  const more = tally({ ...SETUP, weather: "hot", gpm: 1100 });
  assert.ok(more.thrived > hot.thrived && more.lost < 5, JSON.stringify(more));
  const milo = tally({ ...SETUP, weather: "hot", crop: "sorghum" });
  assert.equal(milo.lost, 0, JSON.stringify(milo));
  const sandy = tally({ ...SETUP, weather: "hot", soil: "sandy" });
  assert.ok(sandy.lost > hot.lost, "sandy soil holds less, so it dries out sooner");
});

test("simulate: every ending shows up, with friendly words and a yield hit when it's thirsty", () => {
  const seen = {};
  for (let seed = 1; seed <= 300; seed++) {
    const o = P.simulate({ ...SETUP, weather: "hot", gpm: 600 }, seed).outcome;
    seen[o.level] = seen[o.level] || o;
  }
  assert.deepEqual(Object.keys(seen).sort(), ["lost", "thirsty", "thrived", "tight"]);
  assert.match(seen.thrived.title, /Bumper crop/);
  assert.match(seen.tight.title, /barely/);
  assert.match(seen.thirsty.text, /yield is down about \d+%/);
  assert.match(seen.thirsty.text, /bushels an acre/);
  assert.ok(seen.thirsty.loss >= 5 && seen.thirsty.loss % 5 === 0);
});

test("yieldLoss: stressed days cost a little, bone-dry days a lot", () => {
  assert.equal(P.yieldLoss(0, 0), 0);
  assert.equal(P.yieldLoss(4, 0), 6);
  assert.equal(P.yieldLoss(2, 2), 13);
  assert.equal(P.yieldLoss(50, 30), 100);
});
