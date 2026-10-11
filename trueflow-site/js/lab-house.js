/* Water Lab, House well: will this well, pump and pressure tank keep the showers strong through a busy day?
   The math at the top is pure (runs under `node --test`); the page wiring below only runs on lab.html.
   It plays the day minute by minute: fixtures draw from the pressure tank, the pump refills the tank from
   the water standing in the well casing, and the casing refills only as fast as the well gives water.
   Numbers are rough rules of thumb for a typical farmhouse, not a quote. */
(function (root) {
  "use strict";

  const LIMITS = Object.freeze({ people: [1, 8], well: [1, 20], pump: [5, 20], tank: [20, 120] });
  const DEFAULTS = Object.freeze({ people: 4, well: 8, pump: 10, tank: 44, sprinkler: false, garden: false });

  // fixtures, in gallons per minute while running
  const GPM = Object.freeze({ shower: 2.5, toilet: 1.6, bathSink: 1, kitchen: 1.5, washer: 4, dishes: 1.5, sprinkler: 7, garden: 3, waterer: 3 });
  const CUT_IN = 40, CUT_OUT = 60; // a standard 40/60 pressure switch
  const DRAWDOWN = 0.27; // at 40/60 a tank gives up about 27% of its size between pump starts
  const CASING_FT = 70; // water standing in the casing above the pump on a typical Kansas house well
  const GAL_PER_FT = 1.5; // a 6" casing holds about 1.5 gallons per foot
  const CASING_GAL = CASING_FT * GAL_PER_FT;
  const TRICKLE_PSI = 20; // below this a shower is a cold trickle
  const SAG_PSI = 35; // below this you notice the shower weaken
  const LOW_CASING = 0.25; // under a quarter full the well is barely keeping up

  const DAY_START = 5; // the busy day runs 5 AM to 5 AM
  const HOURS = 24, MINUTES = HOURS * 60;
  const SPRINKLER_HOURS = [19.5, 21.5]; // lawn watering 7:30 to 9:30 PM, once it cools off: right into the evening showers
  const GARDEN_HOURS = [16, 17];
  const WATERER_HOURS = [9, 19]; // the stock tank float tops it up once an hour

  const clamp = (n, [lo, hi]) => Math.max(lo, Math.min(hi, Number(n) || 0));

  /** Cleans up a setup from the page: numbers clamped to their sliders, extras as true or false. */
  function normalize(setup = {}) {
    const s = { ...DEFAULTS, ...setup };
    return {
      people: Math.round(clamp(s.people, LIMITS.people)), well: clamp(s.well, LIMITS.well),
      pump: clamp(s.pump, LIMITS.pump), tank: clamp(s.tank, LIMITS.tank),
      sprinkler: !!s.sprinkler, garden: !!s.garden
    };
  }

  /** "6 AM", "12 PM", "9 PM" for an hour of the day (0 to 23, wraps). */
  function clock(hour) {
    const h = ((Math.round(hour) % 24) + 24) % 24;
    return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
  }

  /** Two bathrooms once there are three or more people; that caps how many showers run at once. */
  const bathrooms = (people) => (people >= 3 ? 2 : 1);

  /** Gallons the tank gives between pump starts (40 to 60 psi). */
  const drawdown = (tankGal) => clamp(tankGal, LIMITS.tank) * DRAWDOWN;

  /**
   * The heaviest few minutes of a typical busy day, in gallons per minute, without random luck.
   * Morning: every bathroom's shower, the kitchen sink and a flush. Evening: fewer showers, the dishwasher,
   * a flush, and the sprinkler if it's on.
   */
  function rush(setup) {
    const s = normalize(setup), baths = Math.min(bathrooms(s.people), s.people);
    const flush = s.people > 1 ? GPM.toilet : 0;
    const morning = baths * GPM.shower + GPM.kitchen + flush;
    const evening = Math.min(baths, Math.max(1, Math.round(s.people * 0.35))) * GPM.shower + GPM.dishes + flush + (s.sprinkler ? GPM.sprinkler : 0);
    const round = (n) => Math.round(n * 10) / 10;
    return evening > morning ? { when: "evening", gpm: round(evening), showers: baths } : { when: "morning", gpm: round(morning), showers: baths };
  }

  /** Small seeded random generator (mulberry32), so a day can be replayed and tested. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Minute of the sim (0 = 5 AM) for a clock time in hours, like 6.5 for 6:30 AM. */
  const at = (clockHours) => Math.round((((clockHours - DAY_START) % 24) + 24) % 24 * 60);

  /**
   * Builds the busy day: for each fixture, an array of gallons per minute for all 1440 minutes.
   * Showers queue up in the bathrooms in the morning and evening; laundry starts during breakfast.
   */
  function schedule(setup, rand) {
    const s = normalize(setup);
    const use = Object.fromEntries(["shower", "toilet", "bathSink", "kitchen", "washer", "dishes", "sprinkler", "garden", "waterer"].map((k) => [k, new Float64Array(MINUTES)]));
    const between = (lo, hi) => lo + rand() * (hi - lo);
    const run = (kind, start, len, gpm = GPM[kind]) => {
      for (let m = Math.max(0, start); m < Math.min(MINUTES, start + len); m++) use[kind][m] += gpm;
    };

    // showers: most people take theirs in the morning rush, the rest at bedtime
    const morning = [], evening = [];
    // the first person always showers in the morning and the second at night; everyone else picks
    for (let p = 0; p < s.people; p++) (p === 0 || (p > 1 && rand() < 0.6) ? morning : evening).push(p);
    const queue = (list, startHour) => {
      const baths = Math.min(bathrooms(s.people), list.length);
      const free = Array.from({ length: baths }, (_, b) => at(startHour) + Math.round(between(0, 12)) + b * 4);
      list.forEach((_, i) => {
        const b = free.indexOf(Math.min(...free)), start = free[b], len = Math.round(between(8, 10.99));
        run("toilet", start - 1, 1);
        run("shower", start, len);
        run("bathSink", start + len + 1, 2);
        free[b] = start + len + 3 + Math.round(between(0, 5));
      });
    };
    queue(morning, 6);
    queue(evening, 20.5);

    // the rest of the flushes, spread over the waking hours
    for (let i = 0; i < s.people * 4; i++) run("toilet", at(between(6, 22)), 1);

    // kitchen sink at breakfast, lunch and supper
    const meals = [[6.4, 7.6, 3], [11.8, 12.6, 2], [17.4, 18.6, 4]];
    meals.forEach(([a, b, n]) => { for (let i = 0; i < n + Math.floor(s.people / 3); i++) run("kitchen", at(between(a, b)), 2); });

    // laundry: a load for every two people, the first started over breakfast; each fills for wash and rinse
    const loads = Math.ceil(s.people / 2);
    let load = at(between(6.75, 7.75));
    for (let i = 0; i < loads; i++) {
      run("washer", load, 3);
      run("washer", load + 28, 2);
      load += 60 + Math.round(between(0, 20));
    }

    // the dishwasher after supper: four short fills
    const dish = at(between(19, 19.5));
    [0, 9, 18, 27].forEach((off) => run("dishes", dish + off, 1));

    if (s.sprinkler) run("sprinkler", at(SPRINKLER_HOURS[0]), (SPRINKLER_HOURS[1] - SPRINKLER_HOURS[0]) * 60);
    if (s.garden) {
      run("garden", at(GARDEN_HOURS[0]), (GARDEN_HOURS[1] - GARDEN_HOURS[0]) * 60);
      for (let h = WATERER_HOURS[0]; h < WATERER_HOURS[1]; h++) run("waterer", at(h + between(0, 0.5)), 6);
    }
    return use;
  }

  const ACTIVITIES = ["kitchen", "washer", "dishes", "sprinkler", "garden", "waterer"];

  /**
   * Plays out one busy day for a setup, minute by minute. Returns 24 hourly steps and how the house came through.
   * Each step has the lowest pressure that hour (overall and while a shower ran), what was running,
   * and how full the pressure tank and the well casing were.
   */
  function simulate(setup, seed = 1) {
    const s = normalize(setup), rand = rng(seed), use = schedule(s, rand);
    const D = drawdown(s.tank);
    let tank = D * 0.6, casing = CASING_GAL, pumping = false, starts = 0;
    const hours = [];
    let worst = { psi: CUT_OUT, hour: 0 }, worstShower = { psi: CUT_OUT, hour: 0 }, lowCasing = { pct: 1, hour: 0 }, dryHour = -1;

    for (let h = 0; h < HOURS; h++) {
      const step = { hour: h, clock: (DAY_START + h) % 24, label: clock(DAY_START + h), gallons: 0, peak: 0, minPsi: CUT_OUT, showerPsi: CUT_OUT,
        showers: 0, pumpMin: 0, starts: 0, casingLow: casing / CASING_GAL, dry: false };
      ACTIVITIES.forEach((k) => { step[k] = false; });

      for (let m = h * 60; m < h * 60 + 60; m++) {
        const need = Object.values(use).reduce((sum, a) => sum + a[m], 0);
        const showers = Math.round(use.shower[m] / GPM.shower);

        // the pressure switch: on at 40 psi (the tank is about to hit the bottom of its drawdown), off at 60 (tank full)
        if (!pumping && tank < need + 0.001) { pumping = true; starts++; step.starts++; }
        let pumped = 0;
        if (pumping) {
          pumped = Math.min(s.pump, casing + s.well); // the pump can only lift what's in the casing plus what flows in
          if (pumped < s.pump - 0.01) { step.dry = true; if (dryHour < 0) dryHour = h; } // sucking air
          casing = Math.min(CASING_GAL, casing + s.well - pumped);
          step.pumpMin++;
        } else casing = Math.min(CASING_GAL, casing + s.well);

        const have = tank + pumped;
        let psi;
        if (have >= need) {
          tank = Math.min(D, have - need);
          psi = CUT_IN + (CUT_OUT - CUT_IN) * (tank / D);
          if (tank >= D - 0.001) pumping = false;
        } else { // the tank is empty and the pump can't keep up: pressure falls with the shortfall
          tank = 0;
          psi = CUT_IN * (have / need);
        }

        step.gallons += need;
        step.peak = Math.max(step.peak, need);
        step.showers = Math.max(step.showers, showers);
        step.minPsi = Math.min(step.minPsi, psi);
        if (showers > 0) step.showerPsi = Math.min(step.showerPsi, psi);
        step.casingLow = Math.min(step.casingLow, casing / CASING_GAL);
        ACTIVITIES.forEach((k) => { if (use[k][m] > 0) step[k] = true; });
      }

      const done = { ...step, gallons: Math.round(step.gallons), peak: Math.round(step.peak * 10) / 10, minPsi: Math.round(step.minPsi),
        showerPsi: Math.round(step.showerPsi), psi: Math.round(CUT_IN + (CUT_OUT - CUT_IN) * (tank / D)), tank: tank / D, casing: casing / CASING_GAL };
      hours.push({ ...done, note: noteFor(done) });
      if (done.minPsi < worst.psi) worst = { psi: done.minPsi, hour: h };
      if (done.showerPsi < worstShower.psi) worstShower = { psi: done.showerPsi, hour: h };
      if (done.casingLow < lowCasing.pct) lowCasing = { pct: done.casingLow, hour: h };
    }

    const gallons = hours.reduce((sum, x) => sum + x.gallons, 0);
    return { hours, gallons, starts, casingGal: CASING_GAL, outcome: judge(s, { worst, worstShower, lowCasing, dryHour, hours }) };
  }

  /** One short line for the board about what that hour was like. */
  function noteFor(x) {
    if (x.dry) return "The casing ran dry. The pump is sucking air!";
    if (x.showerPsi < TRICKLE_PSI) return `Cold trickle! The shower fell to ${x.showerPsi} psi.`;
    if (x.minPsi < SAG_PSI) return `Pressure sagged to ${x.minPsi} psi.`;
    if (x.casingLow < LOW_CASING) return "Water in the casing is getting low.";
    if (x.showers > 1) return `Shower rush: ${x.showers} going at once.`;
    if (x.sprinkler) return "Sprinkler's watering the lawn.";
    if (x.washer) return "The washer is filling.";
    if (x.garden) return "Watering the garden and the stock tank.";
    if (x.showers === 1) return "Someone's in the shower.";
    if (x.dishes) return "Dishwasher's running.";
    return "";
  }

  /** Turns how the day went into one of four endings. */
  function judge(s, { worst, worstShower, lowCasing, dryHour, hours }) {
    const folks = s.people === 1 ? "you" : `all ${s.people} of you`;
    if (dryHour >= 0) {
      const what = hours[dryHour].sprinkler ? " with the sprinkler going" : hours[dryHour].showers ? " in the middle of the showers" : "";
      return { level: "lost", hour: dryHour, title: "The well ran dry.",
        text: `Around ${clock(DAY_START + dryHour)}${what}, the pump pulled the casing empty and started sucking air. No water in the house, and that's how pumps burn up.` };
    }
    if (worstShower.psi < TRICKLE_PSI) {
      return { level: "thirsty", hour: worstShower.hour, title: "Cold trickle!",
        text: `Around ${clock(DAY_START + worstShower.hour)} the pressure fell to ${worstShower.psi} psi and somebody got a sad, cold trickle with a head full of shampoo. The pump can't keep up with the rush.` };
    }
    if (worst.psi < SAG_PSI) {
      return { level: "tight", hour: worst.hour, title: "Made it, with a sag.",
        text: `Around ${clock(DAY_START + worst.hour)} the pressure sagged to ${worst.psi} psi. The showers got weak for a few minutes, but nobody's hair stayed soapy.` };
    }
    if (lowCasing.pct < LOW_CASING) {
      return { level: "tight", hour: lowCasing.hour, title: "Made it, barely.",
        text: `Pressure held, but around ${clock(DAY_START + lowCasing.hour)} the water in the casing got down to ${Math.round(lowCasing.pct * 100)}%. The well is just barely keeping up with the pump.` };
    }
    return { level: "thrived", hour: worst.hour, title: "Strong showers all day.",
      text: `Pressure never dropped below ${worst.psi} psi. Hot, strong showers for ${folks}, and the well barely noticed.` };
  }

  /**
   * The live read-out for the controls: the rush, the tank, and how a dozen busy days turn out.
   * Returns the numbers plus a plain-words verdict with a level (ok, close or short) and a tip.
   */
  function assess(setup, days = 12) {
    const s = normalize(setup), r = rush(s), D = drawdown(s.tank);
    const tally = { thrived: 0, tight: 0, thirsty: 0, lost: 0 };
    let gallons = 0, starts = 0;
    for (let seed = 1; seed <= days; seed++) {
      const run = simulate(s, seed);
      tally[run.outcome.level]++;
      gallons += run.gallons;
      starts += run.starts;
    }
    const short = r.gpm - s.pump, coverMin = short > 0 ? D / short : Infinity;
    const overpull = s.pump - s.well;
    const bad = days * 0.25; // a setup is judged by what happens on at least a quarter of busy days
    let level, text;
    if (tally.lost >= bad) {
      level = "short";
      text = `The pump pulls ${fmt(overpull)} gpm more than this well gives. On a busy day it can suck the casing dry.`;
    } else if (tally.thirsty >= bad) {
      level = "short";
      text = `The ${r.when} rush needs ${fmt(r.gpm)} gpm and the pump gives ${fmt(s.pump)}. The tank covers about ${minutes(coverMin)}, then the showers go to a trickle.`;
    } else if (tally.tight + tally.thirsty + tally.lost >= bad) {
      level = "close";
      text = short > 0
        ? `The ${r.when} rush needs a little more than the pump gives. The tank covers about ${minutes(coverMin)}, then pressure sags.`
        : `Pressure holds, but the pump pulls ${fmt(overpull)} gpm more than the well gives, so long draws run the casing low.`;
    } else {
      level = "ok";
      text = short > 0
        ? `The rush needs more than the pump gives, but the tank's ${Math.round(D)} gallons cover the short bursts.`
        : "Strong showers. The pump outruns the rush and the well keeps up with the pump.";
    }
    return { rush: r, pump: s.pump, well: s.well, drawdown: D, gallons: Math.round(gallons / days), starts: Math.round(starts / days), tally, level, text, tip: tipFor(s, D) };
  }

  const minutes = (n) => (n < 1.5 ? "a minute" : `${Math.round(n)} minutes`);
  const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString("en-US");

  /** One rule of thumb that fits the setup, most useful first. */
  function tipFor(s, D) {
    // a pump should run at least a minute per start, so the tank needs about a gallon of drawdown per gpm
    if (D < s.pump) return `A ${Math.round(s.tank)} gal tank only gives about ${Math.round(D)} gal between starts, so a ${fmt(s.pump)} gpm pump will short-cycle. Go up to about ${Math.ceil(s.pump / DRAWDOWN / 10) * 10} gal.`;
    if (s.pump >= s.well * 1.5) return `This well gives ${fmt(s.well)} gpm and the pump pulls ${fmt(s.pump)}. The water standing in the casing (about ${Math.round(CASING_GAL)} gal) covers the gap for a while. A smaller pump or a storage tank keeps you from running it dry.`;
    if (s.sprinkler) return "Run the sprinkler before supper or overnight, not during showers, and everybody's happy.";
    return `This ${Math.round(s.tank)} gal tank gives about ${Math.round(D)} gal between pump starts. A bigger tank means fewer starts and a longer-lived pump.`;
  }

  const api = { LIMITS, DEFAULTS, GPM, CASING_GAL, DAY_START, HOURS, TRICKLE_PSI, SAG_PSI, normalize, clock, bathrooms, drawdown, rush, simulate, assess };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HouseLab = api;

  // ----- page wiring (lab.html only) -----
  if (typeof document === "undefined") return;
  // the livestock panel's "The house too" checkbox is also id="labHouse", so find this panel by its mode
  const panel = document.querySelector('[data-mode-panel="house"]');
  if (!panel || !root.HouseScene) return;

  const $ = (id) => document.getElementById(id);
  const scene = root.HouseScene.create($("hwSvg"));
  let state = { ...DEFAULTS };
  const NEED = { short: "c2", close: "c2", ok: "c4" }; // contact form: low pressure, or a new install

  function render() {
    const s = state, a = assess(s);
    $("hwPeopleVal").textContent = s.people === 1 ? "1 person" : `${s.people} people`;
    $("hwWellVal").textContent = fmt(s.well) + " gpm";
    $("hwPumpVal").textContent = fmt(s.pump) + " gpm";
    $("hwTankVal").textContent = `${s.tank} gal`;
    $("hwSprinkler").setAttribute("aria-pressed", String(s.sprinkler));
    $("hwGarden").setAttribute("aria-pressed", String(s.garden));
    $("hwPumpOut").textContent = fmt(s.pump);
    $("hwRushOut").textContent = fmt(a.rush.gpm);
    $("hwRushLabel").textContent = a.rush.when === "evening" ? "Evening rush needs" : "Morning rush needs";
    const v = $("hwVerdict");
    v.textContent = a.text;
    v.className = "lab-verdict " + a.level;
    $("hwTip").textContent = `${a.tip} A busy day here uses about ${a.gallons.toLocaleString("en-US")} gallons.`;
    const lost = a.tally.lost >= 3;
    $("hwBook").href = "contact.html?" + new URLSearchParams({ need: lost ? "c1" : NEED[a.level] });

    // the diagram shows the rush hour of a typical day, live
    const evening = a.rush.when === "evening";
    scene.set({
      mode: "live", people: s.people, sprinklerOwned: s.sprinkler, gardenOwned: s.garden,
      clock: evening ? 20.6 : 6.6, asleep: false, showers: Math.min(a.rush.showers, s.people), kitchen: !evening, dishes: evening, washer: false,
      sprinkler: s.sprinkler && evening, garden: false, waterer: false,
      need: a.rush.gpm, pump: s.pump, well: s.well, drawdown: a.drawdown, casingGal: CASING_GAL, ending: null, dry: false
    });
  }

  // ----- the busy-day sim: play the day back an hour at a time on the diagram -----
  const ICON_FOR = { night: "moon", rush: "shower", laundry: "washer", dishes: "faucet", sprinkler: "sprinkler", garden: "sprout", day: "sun", dry: "pump" };
  const RESULT_ICON = { thrived: "shower", tight: "gauge", thirsty: "drop", lost: "pump" };
  const board = root.SimBoard.create("hw", { idle: "Run a busy-day sim", scene: $("hwSvg") });

  /** What kind of hour it was, for the board's icon. */
  function kindOf(x) {
    if (x.dry) return "dry";
    if (x.showers > 0) return "rush";
    if (x.sprinkler) return "sprinkler";
    if (x.washer) return "laundry";
    if (x.garden) return "garden";
    if (x.dishes || x.kitchen) return "dishes";
    return x.clock >= 22 || x.clock < 6 ? "night" : "day";
  }

  function showHour(x) {
    scene.set({
      mode: "run", clock: x.clock + 0.5, asleep: x.clock >= 22 || x.clock < 5 || (x.clock === 5 && x.gallons < 5),
      showers: x.showers, kitchen: x.kitchen, dishes: x.dishes, washer: x.washer, sprinkler: x.sprinkler, garden: x.garden, waterer: x.waterer,
      psi: x.showers > 0 ? x.showerPsi : x.minPsi < 40 ? x.minPsi : x.psi, cycling: x.starts > 0 && x.minPsi >= 40,
      tank: x.tank, casing: x.dry ? 0 : x.casingLow, pumpOn: x.pumpMin / 60, dry: x.dry, trickle: x.showerPsi < TRICKLE_PSI, ending: null
    });
  }

  function showResult(run) {
    const o = run.outcome;
    // the ending replays the hour that decided it; a good day replays its busiest morning hour in the sun
    const morning = run.hours.filter((h) => h.clock >= 6 && h.clock <= 9).reduce((a, b) => (b.showers > a.showers ? b : a));
    const x = o.level === "thrived" ? morning : run.hours[o.hour];
    board.result({ ...o, icon: RESULT_ICON[o.level] }, `${clock(DAY_START)} the next morning`);
    scene.set({
      mode: "run", clock: x.clock + 0.5, asleep: false, showers: Math.max(1, x.showers), kitchen: x.kitchen, dishes: x.dishes, washer: x.washer,
      sprinkler: x.sprinkler || (o.level === "thrived" && state.sprinkler), garden: x.garden, waterer: x.waterer,
      psi: o.level === "lost" ? 0 : o.level === "thirsty" ? x.showerPsi : o.level === "tight" ? Math.max(28, x.minPsi) : 56,
      cycling: false, tank: o.level === "lost" ? 0 : x.tank, casing: o.level === "lost" ? 0 : Math.max(x.casingLow, 0.05),
      pumpOn: o.level === "lost" ? 1 : x.pumpMin / 60, dry: o.level === "lost", trickle: o.level === "thirsty", ending: o.level
    });
    if (o.level === "lost") board.catastrophe();
    else if (o.level !== "thirsty") board.celebrate();
  }

  function runSim() {
    const run = simulate(state, (Math.random() * 2 ** 32) >>> 0);
    board.play(run.hours, {
      stepMs: 560,
      cell: (x) => { const kind = kindOf(x); return { kind, icon: ICON_FOR[kind], level: x.dry ? 0 : x.minPsi / CUT_OUT, bad: x.dry || x.showerPsi < TRICKLE_PSI }; },
      head: (x) => `${x.label} · ${x.dry ? 0 : x.minPsi} psi`,
      note: (x) => x.note,
      onStep: showHour,
      onDone: () => showResult(run)
    });
  }

  const stopSim = () => { board.stop(); };
  $("hwRun").addEventListener("click", runSim);
  document.addEventListener("labmode", stopSim); // switching to another sim stops this one

  const set = (patch) => { stopSim(); state = { ...state, ...patch }; render(); };
  [["people", "hwPeople"], ["well", "hwWell"], ["pump", "hwPump"], ["tank", "hwTank"]].forEach(([k, id]) =>
    $(id).addEventListener("input", (e) => set({ [k]: Number(e.target.value) })));
  [["sprinkler", "hwSprinkler"], ["garden", "hwGarden"]].forEach(([k, id]) =>
    $(id).addEventListener("click", () => set({ [k]: !state[k] })));
  render();
})(typeof window !== "undefined" ? window : globalThis);
