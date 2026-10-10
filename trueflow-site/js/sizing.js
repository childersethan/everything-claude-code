/* Pure calculations for the site. No DOM access, so they run in the browser and under `node --test`. */
(function (root) {
  "use strict";

  const LIMITS = Object.freeze({ bath: [0, 8], kit: [0, 10], hose: [0, 12] });
  const FIXTURES_PER_BATH = 3; // toilet, sink, shower or tub
  const GPM_PER_HOSE = 0.5; // outdoor hydrants rarely all run at once
  const GPM_IRRIGATION = 5;
  const GPM_LIVESTOCK = 3;
  const MIN_GPM = 5;
  const PRECHARGE_OFFSET = 2; // tank pre-charge sits 2 psi under cut-in
  const PRECHARGE_TOLERANCE = 2;
  const EMPTY_TANK_PSI = 5;

  const clamp = (n, [lo, hi]) => Math.max(lo, Math.min(hi, n));

  /** Returns a new counts object with `key` stepped by `delta`, kept inside its limits. */
  function stepCount(counts, key, delta) {
    if (!(key in LIMITS)) throw new Error(`Unknown fixture type: ${key}`);
    return { ...counts, [key]: clamp((counts[key] || 0) + delta, LIMITS[key]) };
  }

  /** Rule-of-thumb peak demand: about 1 GPM per indoor fixture plus outdoor use. */
  function pumpFlow({ bath = 0, kit = 0, hose = 0 }, { irrigation = false, livestock = false } = {}) {
    const bathFixtures = bath * FIXTURES_PER_BATH;
    const raw = bathFixtures + kit + hose * GPM_PER_HOSE
      + (irrigation ? GPM_IRRIGATION : 0) + (livestock ? GPM_LIVESTOCK : 0);
    const gpm = Math.max(MIN_GPM, Math.round(raw));

    const notes = [`${bathFixtures} bathroom fixtures and ${kit} kitchen/laundry fixtures at about 1 GPM each`];
    if (hose) notes.push(`${hose} outdoor hydrant${hose > 1 ? "s" : ""}, not all running at once`);
    if (irrigation) notes.push("Irrigation adds about 5 GPM. A separate zone or timer keeps it from starving the house.");
    if (livestock) notes.push("Livestock tanks add about 3 GPM. A float valve and a storage tank help.");
    notes.push(gpm <= 10 ? "A standard 10 GPM pump covers this."
      : gpm <= 20 ? "Look at a 20 GPM pump, or a constant-pressure system."
      : "This needs a high-capacity pump and a well that can keep up. Call us to test yield.");

    return { gpm, notes };
  }

  /** Compares a tank's measured air charge with the target for a pump's cut-in pressure. */
  function tankPrecharge(cutIn, reading) {
    if (!Number.isFinite(cutIn) || !Number.isFinite(reading)) throw new Error("Pressures must be numbers");
    const target = cutIn - PRECHARGE_OFFSET;
    const diff = reading - target;
    let status, advice;
    if (Math.abs(diff) <= PRECHARGE_TOLERANCE) {
      status = "ok"; advice = "That's right where it should be.";
    } else if (diff < 0 && reading < EMPTY_TANK_PSI) {
      status = "empty"; advice = "That's close to empty. A bladder that won't hold air means the tank needs replacing.";
    } else if (diff < 0) {
      status = "low"; advice = `That's ${-diff} psi low. Add air to ${target} psi and watch whether it holds for a week.`;
    } else {
      status = "high"; advice = `That's ${diff} psi high. Let air out to ${target} psi or the pump won't push its full draw into the tank.`;
    }
    return { target, status, advice };
  }

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /** Day of week (0=Sun) and decimal hour of `date` in `timeZone`, not the visitor's own clock. */
  function localTime(date, timeZone) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23"
    }).formatToParts(date).map((p) => [p.type, p.value]));
    return { day: WEEKDAYS.indexOf(parts.weekday), hour: Number(parts.hour) + Number(parts.minute) / 60 };
  }

  /** hours: {0..6: [openHour, closeHour] | null}, in the business's time zone. */
  function isOpenNow(hours, date, timeZone = "America/Chicago") {
    const { day, hour } = localTime(date, timeZone);
    const h = hours[day];
    return Boolean(h) && hour >= h[0] && hour < h[1];
  }

  function formatHour(h) {
    return ((h + 11) % 12 + 1) + (h >= 12 ? "pm" : "am");
  }

  /** One day's hours as text: "Open 24 hours", "7am–6pm" or "Closed". */
  function formatHours(h, emergency = false) {
    if (!h) return "Closed" + (emergency ? " (emergencies only)" : "");
    if (h[0] === 0 && h[1] === 24) return "Open 24 hours";
    return formatHour(h[0]) + "–" + formatHour(h[1] % 24);
  }

  const EARTH_MILES = 3958.8;
  const rad = (d) => (d * Math.PI) / 180;

  /** Great-circle distance in miles between two {lat, lon} points. */
  function milesBetween(a, b) {
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_MILES * Math.asin(Math.sqrt(h));
  }

  /** Compass bearing from a to b in degrees (0 = north, 90 = east). */
  function bearing(a, b) {
    const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  /** Finds a listed town by name, ignoring case and extra spaces. */
  function findTown(towns, query) {
    const q = String(query).trim().toLowerCase().replace(/\s+/g, " ");
    return towns.find((t) => t.name.toLowerCase() === q) || null;
  }

  /** US phone numbers: 10 digits, or 11 starting with 1. */
  function isValidPhone(value) {
    const d = String(value).replace(/\D/g, "");
    return d.length === 10 || (d.length === 11 && d[0] === "1");
  }

  /** Returns the message with the symptom title in front, keeping whatever the visitor already typed. */
  function prefillMessage(current, title) {
    const text = String(current).trim();
    if (text.startsWith(title)) return text;
    return text ? `${title}. ${text}` : `${title}. `;
  }

  /** Validates the request form's fields. Returns the first problem, or null. */
  function validateRequest({ name, phone }) {
    if (!String(name).trim()) return { field: "name", message: "Add your name so we know who to ask for." };
    if (!String(phone).trim()) return { field: "phone", message: "Add a phone number so we can call you back." };
    if (!isValidPhone(phone)) return { field: "phone", message: "Check the phone number. It needs all 10 digits, area code included." };
    return null;
  }

  const api = { milesBetween, bearing, findTown, LIMITS, stepCount, pumpFlow, tankPrecharge, localTime, isOpenNow, formatHour, formatHours, prefillMessage, isValidPhone, validateRequest };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Sizing = api;
})(typeof window !== "undefined" ? window : globalThis);
