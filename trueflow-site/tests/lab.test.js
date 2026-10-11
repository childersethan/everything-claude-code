const { test } = require("node:test");
const assert = require("node:assert/strict");
const L = require("../js/lab.js");

test("windFactor: nothing below 6 mph, full at 15, eases off once the mill furls", () => {
  assert.equal(L.windFactor(3), 0);
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
});

test("supply: a deeper well pumps less for windmill and solar", () => {
  for (const power of ["windmill", "solar"]) {
    const shallow = L.supply({ power, depth: 100 }).galPerDay;
    const deep = L.supply({ power, depth: 500 }).galPerDay;
    assert.ok(shallow > deep, `${power}: ${shallow} should beat ${deep}`);
  }
  assert.equal(L.supply({ power: "windmill", depth: 150, wind: 2 }).galPerDay, 0);
  assert.equal(L.supply({ power: "windmill", depth: 150, wind: 15 }).galPerDay, 300 * 16);
  assert.throws(() => L.supply({ power: "hamster", depth: 100 }), /Unknown power source/);
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
