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

test("isOpenNow uses the business's time zone, not the visitor's", () => {
  const hours = { 0: null, 1: [7, 18], 2: [7, 18], 3: [7, 18], 4: [7, 18], 5: [7, 18], 6: [8, 14] };
  const tz = "America/Chicago"; // Oct 2026 is CDT, UTC-5
  assert.equal(S.isOpenNow(hours, new Date("2026-10-12T14:00:00Z"), tz), true); // Mon 9am Central
  assert.equal(S.isOpenNow(hours, new Date("2026-10-12T23:00:00Z"), tz), false); // Mon 6pm Central, closing time
  assert.equal(S.isOpenNow(hours, new Date("2026-10-13T00:30:00Z"), tz), false); // Mon 7:30pm Central (5:30pm Pacific)
  assert.equal(S.isOpenNow(hours, new Date("2026-10-11T17:00:00Z"), tz), false); // Sunday
});

test("localTime converts to the given zone", () => {
  assert.deepEqual(S.localTime(new Date("2026-10-12T14:30:00Z"), "America/Chicago"), { day: 1, hour: 9.5 });
});

test("prefillMessage keeps what the visitor typed", () => {
  assert.equal(S.prefillMessage("", "No water at all"), "No water at all. ");
  assert.equal(S.prefillMessage("Started last night", "No water at all"), "No water at all. Started last night");
  assert.equal(S.prefillMessage("No water at all. Started last night", "No water at all"), "No water at all. Started last night");
});

test("formatHour uses 12-hour times", () => {
  assert.equal(S.formatHour(0), "12am");
  assert.equal(S.formatHour(7), "7am");
  assert.equal(S.formatHour(12), "12pm");
  assert.equal(S.formatHour(18), "6pm");
});

test("formatHours handles 24-hour, normal and closed days", () => {
  assert.equal(S.formatHours([0, 24]), "Open 24 hours");
  assert.equal(S.formatHours([7, 18]), "7am–6pm");
  assert.equal(S.formatHours(null, true), "Closed (emergencies only)");
});

test("isOpenNow is always true for 24-hour days", () => {
  const all = { 0: [0, 24], 1: [0, 24], 2: [0, 24], 3: [0, 24], 4: [0, 24], 5: [0, 24], 6: [0, 24] };
  assert.equal(S.isOpenNow(all, new Date("2026-10-12T08:30:00Z"), "America/Chicago"), true); // 3:30am Central
});

test("milesBetween matches known distances", () => {
  const hoxie = { lat: 39.357, lon: -100.441 }, colby = { lat: 39.396, lon: -101.052 }, hays = { lat: 38.879, lon: -99.327 };
  assert.ok(Math.abs(S.milesBetween(hoxie, colby) - 32.6) < 1.5);
  assert.ok(Math.abs(S.milesBetween(hoxie, hays) - 68) < 3);
  assert.equal(S.milesBetween(hoxie, hoxie), 0);
});

test("bearing points the right way", () => {
  const o = { lat: 39, lon: -100 };
  assert.ok(Math.abs(S.bearing(o, { lat: 40, lon: -100 }) - 0) < 0.5);
  assert.ok(Math.abs(S.bearing(o, { lat: 39, lon: -99 }) - 90) < 1);
  assert.ok(Math.abs(S.bearing(o, { lat: 38, lon: -100 }) - 180) < 0.5);
});

test("findTown ignores case and spacing", () => {
  const towns = [{ name: "Hill City" }, { name: "Hoxie" }];
  assert.equal(S.findTown(towns, "  hill   city ").name, "Hill City");
  assert.equal(S.findTown(towns, "Denver"), null);
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
