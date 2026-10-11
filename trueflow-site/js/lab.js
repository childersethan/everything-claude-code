/* Water Lab: build a well and see if it keeps up with the livestock.
   The math at the top is pure (runs under `node --test`); the page wiring below only runs on lab.html.
   Numbers are rough rules of thumb for a typical setup, not a quote. */
(function (root) {
  "use strict";

  const LIMITS = Object.freeze({ depth: [40, 600], wind: [0, 30], sun: [2, 7], herd: [0, 400] });
  // gallons each animal drinks per day by weather; `per` is how many animals each one in the drawing stands for
  const ANIMALS = Object.freeze({
    cattle: { gal: { cool: 10, mild: 15, hot: 20 }, max: 400, step: 10, start: 60, per: 50, unit: "head", noun: "cattle", group: "herd", label: "Cattle" },
    goats: { gal: { cool: 1, mild: 1.5, hot: 2.5 }, max: 1000, step: 10, start: 120, per: 50, unit: "goats", noun: "goats", group: "herd", label: "Goats" },
    chickens: { gal: { cool: 0.05, mild: 0.08, hot: 0.12 }, max: 10000, step: 100, start: 1000, per: 250, unit: "birds", noun: "chickens", group: "flock", label: "Chickens" }
  });
  const GAL_PER_HEAD = ANIMALS.cattle.gal;
  const animalOf = (kind = "cattle") => {
    const a = ANIMALS[kind];
    if (!a) throw new Error(`Unknown animal: ${kind}`);
    return a;
  };
  const HOUSE_GAL_PER_DAY = 300; // a family of four
  const WINDMILL_GPH_SHALLOW = 300; // 8 ft wheel, 1-7/8" cylinder, to about 180 ft of lift
  const WINDMILL_RATED_DEPTH = 180;
  const WIND_START_MPH = 6, WIND_FULL_MPH = 15, WIND_FURL_MPH = 25;
  const WINDMILL_HOURS = 16; // hours a day the wheel is turning on an average day
  const SOLAR_GPM_SHALLOW = 8; // typical solar submersible at 100 ft
  const ELECTRIC_GPM = 10;
  const PRESSURE_HEAD_FT = 92; // 40 psi at the house is about 92 ft of lift
  const PUMP_EFFICIENCY = 0.55;
  const HP_SIZES = [0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10];
  const POWERS = ["windmill", "solar", "electric"];

  const clamp = (n, [lo, hi]) => Math.max(lo, Math.min(hi, Number(n) || 0));

  /** 0 below starting wind, ramps to 1 at full wind, eases back once the mill furls in a gale. */
  function windFactor(mph) {
    const w = clamp(mph, LIMITS.wind);
    if (w < WIND_START_MPH) return 0;
    if (w <= WIND_FULL_MPH) return (w - WIND_START_MPH) / (WIND_FULL_MPH - WIND_START_MPH);
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

  /** Gallons per day the chosen power source can lift from `depth`. */
  function supply({ power, depth, wind = 12, sun = 5.5 }) {
    const d = clamp(depth, LIMITS.depth);
    if (power === "windmill") {
      const gph = WINDMILL_GPH_SHALLOW * Math.min(1, WINDMILL_RATED_DEPTH / d);
      return { galPerDay: Math.round(gph * windFactor(wind) * WINDMILL_HOURS), gpm: gph / 60 };
    }
    if (power === "solar") {
      const gpm = SOLAR_GPM_SHALLOW * Math.min(1, Math.pow(100 / d, 0.9));
      return { galPerDay: Math.round(gpm * 60 * clamp(sun, LIMITS.sun)), gpm };
    }
    if (power === "electric") {
      return { galPerDay: ELECTRIC_GPM * 60 * 24, gpm: ELECTRIC_GPM, hp: pumpHp(d, ELECTRIC_GPM) };
    }
    throw new Error(`Unknown power source: ${power}`);
  }

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
    const spell = SPELLS[setup.power];
    if (!spell) throw new Error(`Unknown power source: ${setup.power}`);
    let tank = storage, spellLeft = 0, heatLeft = 0, streak = 0, worstStreak = 0, dryDays = 0;
    let low = { pct: 1, day: 0 }, streakWeather = [], worstWeather = [];
    const days = [];

    for (let day = 1; day <= SIM_DAYS; day++) {
      let note = "";
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

  const api = { LIMITS, ANIMALS, GAL_PER_HEAD, POWERS, SIM_DAYS, windFactor, demand, supply, pumpHp, verdict, simulate };
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
  const scene = root.LabScene.create(document.getElementById("labSvg"));
  let state = { power: "windmill", depth: 220, wind: 12, sun: 5.5, herd: 60, animal: "cattle", season: "mild", house: false };
  const shownAnimals = () => Math.min(8, Math.ceil(state.herd / ANIMALS[state.animal].per));

  function render() {
    const s = state;
    const need = demand(s);
    const out = supply(s);
    const v = verdict(out.galPerDay, need);

    lab.dataset.power = s.power;
    POWERS.forEach((p) => $("pw-" + p).setAttribute("aria-pressed", String(p === s.power)));
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

    $("supplyOut").textContent = out.galPerDay.toLocaleString("en-US");
    $("needOut").textContent = need.toLocaleString("en-US");
    const verdictEl = $("verdict");
    verdictEl.textContent = v.text;
    verdictEl.className = "lab-verdict " + v.level;
    $("labTip").textContent = TIPS[s.power] + (out.hp ? ` At ${s.depth} ft that's about a ${out.hp} HP pump.` : "");
    $("labBook").href = "contact.html?" + new URLSearchParams({ need: NEED[s.power] });

    // the diagram: the windmill only moves water while the wind turns it
    const gpm = out.galPerDay > 0 ? (s.power === "windmill" ? out.gpm * windFactor(s.wind) : out.gpm) : 0;
    scene.set({
      power: s.power, depth: s.depth, wind: s.wind, windFactor: windFactor(s.wind), sun: s.sun, gpm,
      level: need ? Math.min(1, out.galPerDay / need) * 0.9 : 0.9,
      animal: s.animal, herd: shownAnimals(), weather: "clear", down: 0
    });
    $("simRun").disabled = s.herd === 0; // the sim is about the animals
  }

  // ----- the 30-day sim: play the month back a day at a time on the diagram -----
  const DAY_MS = 320;
  const ICON_FOR = { clear: "sun", calm: "calm", cloudy: "cloud", storm: "storm", heat: "heat" };
  const RESULT_ICON = { thrived: "trough", tight: "gauge", thirsty: "drop" };
  const ANIMAL_ICON = { cattle: "cow", goats: "goat", chickens: "chicken" };
  const ICONS = root.ICONS || {};
  let simTimer = 0;

  function stopSim() {
    clearTimeout(simTimer);
    simTimer = 0;
    $("simBoard").hidden = true;
    $("simResult").textContent = "";
    $("simLabel").textContent = "Run a 30-day sim";
  }

  function showDay(d) {
    const li = $("simDays").children[d.day - 1];
    li.classList.add("on");
    li.classList.toggle("dry", d.dry);
    li.style.setProperty("--lvl", Math.round(d.level * 100) + "%");
    $("simDay").textContent = `Day ${d.day} of ${SIM_DAYS}`;
    $("simNote").textContent = d.note || (d.dry ? "The tank is empty." : "");
    const out = supply(state);
    scene.set({
      wind: d.wind, windFactor: windFactor(d.wind), sun: Math.max(LIMITS.sun[0], d.sun), weather: d.weather,
      gpm: d.pumped > 0 ? out.gpm * Math.min(1, d.pumped / Math.max(1, out.galPerDay)) : 0,
      level: d.level * 0.9, down: 0
    });
  }

  function showResult(run) {
    const o = run.outcome, res = $("simResult");
    res.className = "sim-result " + o.level;
    const icon = o.level === "lost" ? ANIMAL_ICON[state.animal] : RESULT_ICON[o.level];
    res.innerHTML = `<span class="ic">${ICONS[icon] || ""}</span><b></b><p></p>`;
    res.querySelector("b").textContent = o.title;
    res.querySelector("p").textContent = o.text;
    $("simNote").textContent = "";
    $("simDay").textContent = `${SIM_DAYS} days later`;
    $("simLabel").textContent = "Run it again";
    const cows = shownAnimals();
    const lost = o.level === "lost";
    scene.set({
      weather: lost && o.cause === "heat" ? "heat" : lost && o.cause === "blown" ? "storm" : "clear",
      down: lost ? Math.max(1, Math.round(cows * o.lostShare)) : 0, death: o.cause || "fall"
    });
  }

  function runSim() {
    stopSim();
    const run = simulate(state, (Math.random() * 2 ** 32) >>> 0);
    const days = $("simDays");
    days.innerHTML = run.days.map((d) => `<li class="w-${d.weather}"><span class="ic">${ICONS[ICON_FOR[d.weather]] || ""}</span><span class="bar"><i></i></span></li>`).join("");
    $("simBoard").hidden = false;
    $("simLabel").textContent = "Running...";
    const box = $("labSvg").getBoundingClientRect(); // bring the diagram into view so the herd can be watched
    if (box.top < 0 || box.bottom > innerHeight) lab.querySelector(".lab-scene").scrollIntoView({ behavior: root.Motion.reduce() ? "auto" : "smooth", block: "start" });
    if (root.Motion.reduce()) { // reduced motion: show the whole month at once
      run.days.forEach(showDay);
      simTimer = setTimeout(() => showResult(run), 50); // after the board is shown, so screen readers announce it
      return;
    }
    let i = 0;
    const step = () => {
      showDay(run.days[i]);
      i += 1;
      simTimer = i < run.days.length ? setTimeout(step, DAY_MS) : setTimeout(() => showResult(run), DAY_MS);
    };
    step();
  }

  $("simRun").addEventListener("click", runSim);

  const set = (patch) => { stopSim(); state = { ...state, ...patch }; render(); };
  POWERS.forEach((p) => $("pw-" + p).addEventListener("click", () => set({ power: p })));
  Object.entries(ANIMALS).forEach(([k, a]) => $("an-" + k).addEventListener("click", () => {
    if (k === state.animal) return;
    Object.assign($("labHerd"), { max: a.max, step: a.step, value: a.start }); // each animal gets its own slider range
    set({ animal: k, herd: a.start });
  }));
  [["depth", "labDepth"], ["wind", "labWind"], ["sun", "labSun"], ["herd", "labHerd"]].forEach(([k, id]) =>
    $(id).addEventListener("input", (e) => set({ [k]: Number(e.target.value) })));
  $("labSeason").addEventListener("change", (e) => set({ season: e.target.value }));
  $("labHouse").addEventListener("change", (e) => set({ house: e.target.checked }));
  render();
})(typeof window !== "undefined" ? window : globalThis);
