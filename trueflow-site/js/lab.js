/* Water Lab: build a well and see if it keeps up with the livestock.
   The math at the top is pure (runs under `node --test`); the page wiring below only runs on lab.html.
   Numbers are rough rules of thumb for a typical setup, not a quote. */
(function (root) {
  "use strict";

  const LIMITS = Object.freeze({ depth: [40, 600], wind: [0, 30], sun: [2, 7], herd: [0, 400], size: [0, 2] });
  // gallons each animal drinks per day by weather; `per` is how many animals each one in the drawing stands for
  const ANIMALS = Object.freeze({
    cattle: { gal: { cool: 10, mild: 15, hot: 20 }, max: 400, step: 10, start: 60, sizes: [25, 60, 200], per: 50, unit: "head", noun: "cattle", group: "herd", label: "Cattle" },
    goats: { gal: { cool: 1, mild: 1.5, hot: 2.5 }, max: 1000, step: 10, start: 120, sizes: [50, 120, 600], per: 50, unit: "goats", noun: "goats", group: "herd", label: "Goats" },
    chickens: { gal: { cool: 0.05, mild: 0.08, hot: 0.12 }, max: 10000, step: 100, start: 1000, sizes: [300, 1000, 5000], per: 250, unit: "birds", noun: "chickens", group: "flock", label: "Chickens" }
  });
  const GAL_PER_HEAD = ANIMALS.cattle.gal;
  const animalOf = (kind = "cattle") => {
    const a = ANIMALS[kind];
    if (!a) throw new Error(`Unknown animal: ${kind}`);
    return a;
  };
  const HOUSE_GAL_PER_DAY = 300; // a family of four
  // Pump sizes people can pick. Windmill: an 8 ft Aermotor on the long stroke in a 15 to 20 mph wind.
  // A bigger cylinder moves more water per stroke but can't lift it as high (Aermotor pumping capacity chart).
  const SIZES = Object.freeze({
    windmill: [
      { label: '2" cylinder', gph: 190, lift: 164 },
      { label: '2½" cylinder', gph: 325, lift: 111 },
      { label: '3" cylinder', gph: 470, lift: 80 }
    ],
    solar: [{ label: "Small solar", gpm: 3 }, { label: "Medium solar", gpm: 6 }, { label: "Big solar", gpm: 10 }], // at 100 ft of lift
    electric: [{ label: "5 gpm pump", gpm: 5 }, { label: "10 gpm pump", gpm: 10 }, { label: "20 gpm pump", gpm: 20 }]
  });
  const DEFAULT_SIZE = Object.freeze({ windmill: 0, solar: 1, electric: 1 });
  // Wind: nothing below 6 mph; about 62% of rated output at 10 mph and 80% at 12; full from 15 until the mill furls
  const WIND_START_MPH = 6, WIND_LOW_MPH = 10, WIND_LOW_SHARE = 0.62, WIND_FULL_MPH = 15, WIND_FURL_MPH = 25;
  const WINDMILL_HOURS = 16; // hours a day the wheel is turning on an average day
  const PRESSURE_HEAD_FT = 92; // 40 psi at the house is about 92 ft of lift
  const PUMP_EFFICIENCY = 0.55;
  const HP_SIZES = [0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10];
  const POWERS = ["windmill", "solar", "electric"];

  const clamp = (n, [lo, hi]) => Math.max(lo, Math.min(hi, Number(n) || 0));

  /** 0 below starting wind, ramps up to 1 at full wind, eases back once the mill furls in a gale. */
  function windFactor(mph) {
    const w = clamp(mph, LIMITS.wind);
    if (w < WIND_START_MPH) return 0;
    if (w <= WIND_LOW_MPH) return (WIND_LOW_SHARE * (w - WIND_START_MPH)) / (WIND_LOW_MPH - WIND_START_MPH);
    if (w <= WIND_FULL_MPH) return WIND_LOW_SHARE + ((1 - WIND_LOW_SHARE) * (w - WIND_LOW_MPH)) / (WIND_FULL_MPH - WIND_LOW_MPH);
    if (w <= WIND_FURL_MPH) return 1;
    return 0.7;
  }

  /** Gallons per day the animals (and optionally the house) drink. */
  function demand({ herd, season = "mild", house = false, animal = "cattle" }) {
    const a = animalOf(animal), perHead = a.gal[season];
    if (perHead === undefined) throw new Error(`Unknown season: ${season}`);
    return Math.round(clamp(herd, [0, a.max]) * perHead + (house ? HOUSE_GAL_PER_DAY : 0));
  }

  /** Smallest standard motor that lifts `gpm` from `depth` and still gives house pressure. */
  function pumpHp(depth, gpm) {
    const hp = (gpm * (depth + PRESSURE_HEAD_FT)) / (3960 * PUMP_EFFICIENCY);
    return HP_SIZES.find((s) => s >= hp) ?? HP_SIZES.at(-1);
  }

  /** The pump size picked for this power source (0 smallest to 2 biggest). */
  function sizeOf(power, size) {
    const list = SIZES[power];
    if (!list) throw new Error(`Unknown power source: ${power}`);
    return list[Math.round(clamp(size ?? DEFAULT_SIZE[power], LIMITS.size))];
  }

  /**
   * Gallons per day the chosen pump can lift from `depth`, and its gallons a minute while running.
   * A windmill cylinder set deeper than it can lift stalls the mill: `tooDeep` and nothing pumped.
   */
  function supply({ power, depth, wind = 12, sun = 5.5, size }) {
    const d = clamp(depth, LIMITS.depth), pick = sizeOf(power, size);
    if (power === "windmill") {
      if (d > pick.lift) return { galPerDay: 0, gpm: 0, tooDeep: true, lift: pick.lift, label: pick.label };
      return { galPerDay: Math.round(pick.gph * windFactor(wind) * WINDMILL_HOURS), gpm: pick.gph / 60, lift: pick.lift, label: pick.label };
    }
    if (power === "solar") {
      const gpm = pick.gpm * Math.min(1, Math.pow(100 / d, 0.9));
      return { galPerDay: Math.round(gpm * 60 * clamp(sun, LIMITS.sun)), gpm, label: pick.label };
    }
    return { galPerDay: pick.gpm * 60 * 24, gpm: pick.gpm, hp: pumpHp(d, pick.gpm), label: pick.label };
  }

  /** Says plainly that a windmill cylinder is set deeper than it can lift. */
  const tooDeepText = (out) => `A ${out.label.replace(" cylinder", "")} cylinder on an 8 ft windmill only lifts about ${out.lift} ft. The mill stalls. Pick a smaller cylinder or a shallower well.`;

  /**
   * The gpm this setup should have: the day's water (plus a quarter for a cushion) spread over the hours
   * this power source actually runs, and the smallest size on offer that covers it at this depth (-1 if none).
   */
  function rightSize(setup) {
    const want = demand(setup) * 1.25;
    const hours = setup.power === "windmill" ? WINDMILL_HOURS * windFactor(setup.wind ?? 12)
      : setup.power === "solar" ? clamp(setup.sun ?? 5.5, LIMITS.sun) : 24;
    const index = SIZES[setup.power].findIndex((_, size) => supply({ ...setup, size }).galPerDay >= want);
    return { gpm: hours > 0 ? want / (hours * 60) : Infinity, index };
  }

  /** One plain line: the gpm you need, and which size gives it. */
  function rightSizeText(setup) {
    if (demand(setup) === 0) return "";
    const fit = rightSize(setup), runs = RUNS[setup.power];
    if (fit.gpm === Infinity) return "Right size: no wind, no water. A mill needs at least 6 mph to turn.";
    const need = `Right size: about ${fit.gpm < 10 ? +fit.gpm.toFixed(1) : Math.round(fit.gpm)} gpm ${runs}.`;
    const label = SIZES[setup.power][fit.index]?.label;
    if (label) return `${need} ${setup.power === "solar" ? `A ${label.toLowerCase()} pump` : `The ${label}`} covers it.`;
    if (setup.power === "windmill" && SIZES.windmill.every((c) => c.lift < clamp(setup.depth, LIMITS.depth))) return `${need} At this depth no windmill cylinder can lift it. Go solar or electric.`;
    return `${need} None of these sizes gives that much at this depth. Add a second pump or go electric.`;
  }
  const RUNS = { windmill: "while the wind blows", solar: "in full sun", electric: "around the clock" };

  /** Compares supply with demand and says what that means in plain words. */
  function verdict(galPerDay, need) {
    if (need === 0) return { level: "ok", ratio: 1, text: "Add some animals to see if this well keeps up." };
    const ratio = galPerDay / need;
    if (ratio >= 1.25) return { level: "ok", ratio, text: "Keeps up with room to spare." };
    if (ratio >= 1) return { level: "close", ratio, text: "Just keeps up. A storage tank gives you a cushion for still or cloudy days." };
    return { level: "short", ratio, text: `Falls short by about ${(need - galPerDay).toLocaleString("en-US")} gallons a day.` };
  }

  // ----- the 30-day sim: real weather isn't average, so play out a month of it -----
  const SIM_DAYS = 30;
  const STORAGE_DAYS = 4; // stock tank plus storage holds about four days of what the animals drink
  const DRY_DAYS_LOST = 3; // three days in a row with no water and you lose animals

  /** Small seeded random generator (mulberry32), so a run can be replayed and tested. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Spells of bad weather: chance per day to start one, how long it lasts, and what it does
  const SPELLS = {
    windmill: { kind: "calm", chance: 0.06, len: [2, 3], note: "Dead calm. The wheel barely turns." },
    solar: { kind: "cloudy", chance: 0.08, len: [1, 3], note: "Clouds roll in. The panels go quiet." },
    electric: { kind: "storm", chance: 0.03, len: [1, 1], note: "A storm knocks the power out." }
  };
  const HEAT = { cool: 0, mild: 0.04, hot: 0.12 }; // chance per day a heat wave starts
  const HEAT_NOTE = "Heat wave. Everything drinks a third more.";
  const STALL_NOTE = "Too deep for this cylinder. The windmill can't lift the water.";

  /** Gallons pumped on one simulated day. */
  function dayPumped(setup, { wind, sun, bad }) {
    if (setup.power === "windmill") return supply({ ...setup, wind }).galPerDay;
    if (setup.power === "solar") return supply(setup).gpm * 60 * sun;
    return bad ? 0 : supply(setup).galPerDay;
  }

  /** Plays out SIM_DAYS of weather for a setup. Returns each day and how the animals came through. */
  function simulate(setup, seed = 1) {
    const rand = rng(seed);
    const between = ([lo, hi]) => lo + Math.floor(rand() * (hi - lo + 1));
    const baseNeed = demand(setup);
    const storage = Math.max(500, baseNeed * STORAGE_DAYS);
    const spell = SPELLS[setup.power], stalled = !!supply(setup).tooDeep;
    if (!spell) throw new Error(`Unknown power source: ${setup.power}`);
    let tank = storage, spellLeft = 0, heatLeft = 0, streak = 0, worstStreak = 0, dryDays = 0;
    let low = { pct: 1, day: 0 }, streakWeather = [], worstWeather = [];
    const days = [];

    for (let day = 1; day <= SIM_DAYS; day++) {
      let note = day === 1 && stalled ? STALL_NOTE : "";
      if (spellLeft === 0 && rand() < spell.chance) { spellLeft = between(spell.len); note = spell.note; }
      if (heatLeft === 0 && rand() < (HEAT[setup.season] ?? 0)) { heatLeft = between([2, 4]); note = note || HEAT_NOTE; }
      const bad = spellLeft > 0, hot = heatLeft > 0;
      spellLeft = Math.max(0, spellLeft - 1);
      heatLeft = Math.max(0, heatLeft - 1);

      const swing = 0.8 + rand() * 0.5; // ordinary day-to-day weather
      const wind = Math.round(clamp((setup.wind ?? 12) * (bad ? 0.15 : swing), LIMITS.wind));
      const sun = clamp((setup.sun ?? 5.5) * (bad ? 0.25 : 0.85 + rand() * 0.25), [0, LIMITS.sun[1]]);
      const pumped = dayPumped(setup, { wind, sun, bad });
      const need = Math.round(baseNeed * (hot ? 1.33 : 0.95 + rand() * 0.1));

      tank = Math.min(storage, tank + Math.round(pumped) - need);
      const dry = tank < 0;
      const weather = bad ? spell.kind : hot ? "heat" : "clear";
      if (dry) {
        tank = 0; dryDays++; streak++; streakWeather = [...streakWeather, weather];
        if (streak > worstStreak) { worstStreak = streak; worstWeather = streakWeather; }
      } else { streak = 0; streakWeather = []; }
      if (tank / storage < low.pct) low = { pct: tank / storage, day };
      days.push({ day, pumped: Math.round(pumped), need, tank, level: tank / storage, dry, wind, sun, weather, note });
    }
    return { days, storage, outcome: judge(setup, { dryDays, worstStreak, low, cause: causeOf(setup.season, worstWeather) }) };
  }

  /** How the cartoon animals go if it runs dry: shrivels in the heat, blown off in a storm, or just keels over. */
  function causeOf(season, weather) {
    if (season === "hot" || weather.includes("heat")) return "heat";
    if (weather.includes("storm")) return "blown";
    return "fall";
  }

  /** Turns how the tank held up into one of four endings. */
  function judge({ herd, animal }, { dryDays, worstStreak, low, cause }) {
    const pct = Math.round(low.pct * 100), a = animalOf(animal), thirsty = animal === "chickens" ? "thirsty hens stop laying" : `thirsty ${a.noun} lose weight fast`;
    if (worstStreak >= DRY_DAYS_LOST) {
      const lostShare = Math.min(1, 0.15 * (worstStreak - DRY_DAYS_LOST + 1));
      const head = Math.max(1, Math.round(clamp(herd, [0, a.max]) * lostShare));
      return { level: "lost", lostShare, cause, title: `You lost ${a.noun}.`,
        text: `The tank sat empty ${worstStreak} days in a row. That's too long without water, and ${lostShare === 1 ? `the whole ${a.group}` : `about ${head} ${a.unit}`} didn't make it.` };
    }
    if (dryDays > 0) return { level: "thirsty", lostShare: 0, title: "Close call.",
      text: `The tank ran dry ${dryDays} ${dryDays === 1 ? "day" : "days"}. The ${a.group} pulled through, but ${thirsty}.` };
    if (low.pct < 0.25) return { level: "tight", lostShare: 0, title: "Made it, barely.",
      text: `The tank dropped to ${pct}% on day ${low.day}. One more bad spell and you'd be hauling water.` };
    return { level: "thrived", lostShare: 0, title: `The ${a.group} thrived.`,
      text: `The tank never dropped below ${pct}%. Fat, happy ${a.noun} all month.` };
  }

  const api = { LIMITS, ANIMALS, GAL_PER_HEAD, POWERS, SIZES, DEFAULT_SIZE, SIM_DAYS, windFactor, demand, supply, sizeOf, pumpHp, verdict, tooDeepText, rightSize, rightSizeText, simulate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WaterLab = api;

  // ----- page wiring (lab.html only) -----
  if (typeof document === "undefined") return;
  const lab = document.getElementById("lab");
  if (!lab) return;

  const $ = (id) => document.getElementById(id);
  const TIPS = {
    windmill: "Windmills run free on Kansas wind, but a still week drains the tank. Pair one with a big storage tank.",
    solar: "Solar pumps run all day in the sun with no power bill. A float switch shuts them off when the tank is full.",
    electric: "An electric submersible pumps whenever you need it, as long as there's power at the well."
  };
  const NEED = { windmill: "c6", solar: "c6", electric: "c4" };
  const FACTS = [
    "A beef cow drinks about 15 gallons a day, and 20 or more in a heat wave.",
    "A windmill only pumps while the wind blows, so the stock tank is its battery.",
    "A goat drinks about 1 to 2 and a half gallons a day.",
    "A thousand laying hens drink about 80 gallons on a mild day.",
    "A solar pump does most of its work in 5 or 6 hours of strong sun."
  ];
  const HERD_SIZES = ["few", "some", "lots"];
  const scene = root.LabScene.create(document.getElementById("labSvg"));
  let state = { power: "windmill", size: DEFAULT_SIZE.windmill, depth: 120, wind: 12, sun: 5.5, herd: 60, animal: "cattle", season: "mild", house: false };
  /** The small print under each size button: what that size really does. */
  const sizeNote = (power, pick, depth) => power === "windmill" ? `${(pick.gph / 60).toFixed(1)} gpm, lifts ${pick.lift} ft`
    : power === "solar" ? `${pick.gpm} gpm at 100 ft` : `${pumpHp(depth, pick.gpm)} HP at ${depth} ft`;
  const shownAnimals = () => Math.min(8, Math.ceil(state.herd / ANIMALS[state.animal].per));

  function render() {
    const s = state;
    const need = demand(s);
    const out = supply(s);
    const v = out.tooDeep ? { level: "short", text: tooDeepText(out) } : verdict(out.galPerDay, need);

    lab.dataset.power = s.power;
    POWERS.forEach((p) => $("pw-" + p).setAttribute("aria-pressed", String(p === s.power)));
    SIZES[s.power].forEach((pick, i) => {
      const b = $("sz-" + i);
      b.querySelector("span").textContent = pick.label;
      b.querySelector("small").textContent = sizeNote(s.power, pick, s.depth);
      b.setAttribute("aria-pressed", String(i === s.size));
    });
    $("windRow").hidden = s.power !== "windmill";
    $("sunRow").hidden = s.power !== "solar";
    $("depthVal").textContent = s.depth + " ft";
    $("windVal").textContent = s.wind + " mph";
    $("sunVal").textContent = s.sun + " hrs";
    const a = ANIMALS[s.animal];
    Object.keys(ANIMALS).forEach((k) => $("an-" + k).setAttribute("aria-pressed", String(k === s.animal)));
    $("herdLabel").textContent = a.label;
    $("needLabel").textContent = a.group === "flock" ? "Flock drinks" : "Herd drinks";
    $("herdVal").textContent = s.herd.toLocaleString("en-US") + " " + a.unit;
    HERD_SIZES.forEach((k, i) => {
      const b = $("hd-" + k);
      b.querySelector("small").textContent = a.sizes[i].toLocaleString("en-US") + " " + a.unit;
      b.setAttribute("aria-pressed", String(a.sizes[i] === s.herd));
    });

    $("supplyOut").textContent = out.galPerDay.toLocaleString("en-US");
    $("supplyNote").textContent = out.tooDeep ? "too deep: the mill stalls" : `gal / day · ${+out.gpm.toFixed(1)} gpm ${RUNS[s.power]}`;
    $("needOut").textContent = need.toLocaleString("en-US");
    $("fitOut").textContent = rightSizeText(s);
    const verdictEl = $("verdict");
    verdictEl.textContent = v.text;
    verdictEl.className = "lab-verdict " + v.level;
    $("labTip").textContent = TIPS[s.power] + (out.hp ? ` At ${s.depth} ft that's about a ${out.hp} HP pump.` : "") +
      (s.power === "windmill" ? " A bigger cylinder pumps more each stroke, but the mill can't lift it as deep." : "");
    $("labBook").href = "contact.html?" + new URLSearchParams({ need: NEED[s.power] });

    // the diagram: the windmill only moves water while the wind turns it
    const gpm = out.galPerDay > 0 ? (s.power === "windmill" ? out.gpm * windFactor(s.wind) : out.gpm) : 0;
    scene.set({
      power: s.power, depth: s.depth, wind: s.wind, windFactor: windFactor(s.wind), sun: s.sun, gpm,
      level: need ? Math.min(1, out.galPerDay / need) * 0.9 : 0.9,
      animal: s.animal, herd: shownAnimals(), weather: "clear", down: 0, party: false
    });
    $("simRun").disabled = s.herd === 0; // the sim is about the animals
  }

  // ----- the 30-day sim: play the month back a day at a time on the diagram -----
  const ICON_FOR = { clear: "sun", calm: "calm", cloudy: "cloud", storm: "storm", heat: "heat" };
  const RESULT_ICON = { thrived: "trough", tight: "gauge", thirsty: "drop" };
  const ANIMAL_ICON = { cattle: "cow", goats: "goat", chickens: "chicken" };
  const board = root.SimBoard.create("sim", { idle: "Play a month", scene: $("labSvg") });
  const stopSim = () => board.stop();

  function showDay(d) {
    const out = supply(state);
    scene.set({
      wind: d.wind, windFactor: windFactor(d.wind), sun: Math.max(LIMITS.sun[0], d.sun), weather: d.weather,
      gpm: d.pumped > 0 ? out.gpm * Math.min(1, d.pumped / Math.max(1, out.galPerDay)) : 0,
      level: d.level * 0.9, down: 0, party: false
    });
  }

  function showResult(run) {
    const o = run.outcome, lost = o.level === "lost";
    board.result({ ...o, icon: lost ? ANIMAL_ICON[state.animal] : RESULT_ICON[o.level], fact: root.SimBoard.pick(FACTS) }, `${SIM_DAYS} days later`);
    scene.set({
      weather: lost && o.cause === "heat" ? "heat" : lost && o.cause === "blown" ? "storm" : "clear",
      down: lost ? Math.max(1, Math.round(shownAnimals() * o.lostShare)) : 0, death: o.cause || "fall",
      party: o.level === "thrived" || o.level === "tight"
    });
    if (lost) board.catastrophe(); else if (o.level !== "thirsty") board.celebrate();
  }

  function runSim() {
    const run = simulate(state, (Math.random() * 2 ** 32) >>> 0);
    board.play(run.days, {
      cell: (d) => ({ kind: d.weather, icon: ICON_FOR[d.weather], level: d.level, bad: d.dry }),
      head: (d) => `Day ${d.day} of ${SIM_DAYS}`,
      note: (d) => d.note || (d.dry ? "The tank is empty." : ""),
      onStep: showDay,
      onDone: () => showResult(run)
    });
  }

  $("simRun").addEventListener("click", runSim);
  document.addEventListener("labmode", () => { stopSim(); render(); }); // switching sims stops a run and resets the picture

  const set = (patch) => { stopSim(); state = { ...state, ...patch }; render(); };
  POWERS.forEach((p) => $("pw-" + p).addEventListener("click", () => { if (p !== state.power) set({ power: p, size: DEFAULT_SIZE[p] }); }));
  [0, 1, 2].forEach((i) => $("sz-" + i).addEventListener("click", () => set({ size: i })));
  Object.entries(ANIMALS).forEach(([k, a]) => $("an-" + k).addEventListener("click", () => {
    if (k === state.animal) return;
    Object.assign($("labHerd"), { max: a.max, step: a.step, value: a.start }); // each animal gets its own slider range
    set({ animal: k, herd: a.start });
  }));
  HERD_SIZES.forEach((k, i) => $("hd-" + k).addEventListener("click", () => {
    const herd = ANIMALS[state.animal].sizes[i];
    $("labHerd").value = herd;
    set({ herd });
  }));
  [["depth", "labDepth"], ["wind", "labWind"], ["sun", "labSun"], ["herd", "labHerd"]].forEach(([k, id]) =>
    $(id).addEventListener("input", (e) => set({ [k]: Number(e.target.value) })));
  $("labSeason").addEventListener("change", (e) => set({ season: e.target.value }));
  $("labHouseToo").addEventListener("change", (e) => set({ house: e.target.checked }));
  render();
})(typeof window !== "undefined" ? window : globalThis);
