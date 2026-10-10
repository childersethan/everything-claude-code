const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../js/sizing.js");

test("stepCount returns a new object and leaves the input alone", () => {
  const before = { bath: 2, kit: 3, hose: 2 };
  const after = S.stepCount(before, "bath", 1);
  assert.deepEqual(after, { bath: 3, kit: 3, hose: 2 });
  assert.deepEqual(before, { bath: 2, kit: 3, hose: 2 });
});

test("stepCount clamps to the fixture limits", () => {
  assert.equal(S.stepCount({ bath: 0 }, "bath", -1).bath, 0);
  assert.equal(S.stepCount({ bath: 8 }, "bath", 1).bath, 8);
  assert.equal(S.stepCount({ hose: 12 }, "hose", 5).hose, 12);
});

test("stepCount rejects unknown fixture types", () => {
  assert.throws(() => S.stepCount({}, "pool", 1), /Unknown fixture type/);
});

test("pumpFlow: 2 baths, 3 kitchen fixtures, 2 hydrants is 10 GPM", () => {
  const r = S.pumpFlow({ bath: 2, kit: 3, hose: 2 });
  assert.equal(r.gpm, 10);
  assert.match(r.notes.at(-1), /standard 10 GPM/);
});

test("pumpFlow adds irrigation and livestock", () => {
  const r = S.pumpFlow({ bath: 3, kit: 3, hose: 2 }, { irrigation: true, livestock: true });
  assert.equal(r.gpm, 9 + 3 + 1 + 5 + 3);
  assert.match(r.notes.at(-1), /high-capacity/);
});

test("pumpFlow never suggests less than 5 GPM", () => {
  assert.equal(S.pumpFlow({ bath: 0, kit: 0, hose: 0 }).gpm, 5);
});

test("tankPrecharge targets 2 psi under cut-in", () => {
  assert.equal(S.tankPrecharge(40, 38).target, 38);
  assert.equal(S.tankPrecharge(40, 38).status, "ok");
  assert.equal(S.tankPrecharge(30, 29).status, "ok");
});

test("tankPrecharge reports low, high and empty tanks", () => {
  assert.equal(S.tankPrecharge(40, 25).status, "low");
  assert.match(S.tankPrecharge(40, 25).advice, /13 psi low/);
  assert.equal(S.tankPrecharge(40, 50).status, "high");
  assert.equal(S.tankPrecharge(40, 2).status, "empty");
});

test("tankPrecharge rejects non-numbers", () => {
  assert.throws(() => S.tankPrecharge(NaN, 20));
});

test("isOpenNow respects hours and closed days", () => {
  const hours = { 0: null, 1: [7, 18], 2: [7, 18], 3: [7, 18], 4: [7, 18], 5: [7, 18], 6: [8, 14] };
  assert.equal(S.isOpenNow(hours, new Date(2026, 9, 12, 9, 0)), true); // Monday 9am
  assert.equal(S.isOpenNow(hours, new Date(2026, 9, 12, 18, 0)), false); // Monday 6pm, closing time
  assert.equal(S.isOpenNow(hours, new Date(2026, 9, 11, 12, 0)), false); // Sunday
});

test("formatHour uses 12-hour times", () => {
  assert.equal(S.formatHour(0), "12am");
  assert.equal(S.formatHour(7), "7am");
  assert.equal(S.formatHour(12), "12pm");
  assert.equal(S.formatHour(18), "6pm");
});

test("isValidPhone accepts 10 digits or 1 + 10 digits", () => {
  assert.equal(S.isValidPhone("(806) 555-0101"), true);
  assert.equal(S.isValidPhone("1-806-555-0101"), true);
  assert.equal(S.isValidPhone("555-0101"), false);
  assert.equal(S.isValidPhone("2-806-555-0101"), false);
});

test("validateRequest returns the first problem", () => {
  assert.equal(S.validateRequest({ name: " ", phone: "8065550101" }).field, "name");
  assert.equal(S.validateRequest({ name: "Jo", phone: "" }).field, "phone");
  assert.match(S.validateRequest({ name: "Jo", phone: "555" }).message, /10 digits/);
  assert.equal(S.validateRequest({ name: "Jo", phone: "806 555 0101" }), null);
});
