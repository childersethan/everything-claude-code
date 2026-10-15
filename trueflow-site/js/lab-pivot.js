/* Water Lab, pivot sprinklers: does this center pivot put down enough water to keep the crop alive through a hot stretch?
   The math at the top is pure (runs under `node --test`); the page wiring below only runs when the pivot panel is on the page.
   Numbers are rough rules of thumb for western Kansas, not an irrigation schedule. */
(function (root) {
  "use strict";

  const LIMITS = Object.freeze({ acres: [60, 160], gpm: [200, 1200] });
  const GAL_PER_ACRE_INCH = 27154; // one inch of water over one acre
  const EFFICIENCY = 0.85; // a drop-nozzle pivot loses about 15% to drift and evaporation

  // Peak water use (ET) in inches a day by weather, a normal irrigated yield, and how many extra dry days it can stand.
  const CROPS = Object.freeze({
    corn: { label: "Corn", noun: "corn", et: { cool: 0.18, mild: 0.25, hot: 0.33 }, yield: [220, "bushels an acre"], hardy: 0,
      tip: "K-State figures corn out here needs about 5 gallons a minute per acre to get through most summers, and 6 or more to ride out a real heat wave." },
    soybeans: { label: "Soybeans", noun: "beans", et: { cool: 0.16, mild: 0.22, hot: 0.30 }, yield: [65, "bushels an acre"], hardy: 0,
      tip: "Beans drink less than corn, but they peak in August while they set pods." },
    wheat: { label: "Wheat", noun: "wheat", et: { cool: 0.14, mild: 0.20, hot: 0.26 }, yield: [80, "bushels an acre"], hardy: 0,
      tip: "Wheat does most of its drinking in spring and is usually cut before the worst heat." },
    alfalfa: { label: "Alfalfa", noun: "alfalfa", et: { cool: 0.20, mild: 0.27, hot: 0.35 }, yield: [7, "tons an acre a year"], hardy: 0,
      tip: "Alfalfa is the thirstiest crop out here. It drinks hard from April to October." },
    sorghum: { label: "Sorghum", noun: "milo", et: { cool: 0.14, mild: 0.20, hot: 0.27 }, yield: [140, "bushels an acre"], hardy: 2,
      tip: "Milo handles a dry spell better than corn. It can sit tight a few days and wait for rain." }
  });
  // Water the top 3 ft of root zone holds that the crop can use, in inches (about 1.0, 1.8 and 2.2 inches a foot)
  const SOILS = Object.freeze({ sandy: 3, loam: 5.4, silt: 6.6 });
  const SOIL_NAMES = { sandy: "Sandy ground", loam: "Loam", silt: "Silt loam" };
  const WEATHERS = ["cool", "mild", "hot"];

  const clamp = (n, [lo, hi]) => Math.max(lo, Math.min(hi, Number(n) || 0));
  const cropOf = (crop = "corn") => {
    const c = CROPS[crop];
    if (!c) throw new Error(`Unknown crop: ${crop}`);
    return c;
  };

  /** Inches a day the pivot gets into the soil: gallons pumped spread over the circle, less what blows away. */
  function applied({ gpm, acres }) {
    const gross = (clamp(gpm, LIMITS.gpm) * 1440) / (GAL_PER_ACRE_INCH * clamp(acres, LIMITS.acres));
    return gross * EFFICIENCY;
  }

  /** Inches a day the crop uses at its peak in this weather. */
  function cropUse({ crop, weather = "mild" }) {
    const et = cropOf(crop).et[weather];
    if (et === undefined) throw new Error(`Unknown weather: ${weather}`);
    return et;
  }

  /** Gallons a minute per acre, the rule of thumb farmers size pivots by. */
  const gpmPerAcre = ({ gpm, acres }) => clamp(gpm, LIMITS.gpm) / clamp(acres, LIMITS.acres);

  const inches = (n) => n.toFixed(2);

  /** Compares what the pivot puts down with what the crop uses, in plain words. */
  function verdict(put, use) {
    const ratio = put / use;
    if (ratio >= 1.15) return { level: "ok", ratio, text: "Keeps ahead of the crop, with some to spare for a hot spell." };
    if (ratio >= 1) return { level: "close", ratio, text: "Just keeps up. A heat wave or a breakdown will put the crop behind." };
    const gap = use - put;
    return { level: "short", ratio,
      text: `Falls behind about ${inches(gap)} in a day. Over a month that's ${(gap * 30).toFixed(1)} inches the rain has to make up.` };
  }

  // ----- the 30-day sim: a month of real weather, with a soil-moisture bucket between the pivot and the crop -----
  const SIM_DAYS = 30;
  const START_FULL = 0.8; // the soil starts the month most of the way full
  const STRESS = 0.5; // once the crop has used half of what the soil holds, it curls its leaves and yield starts to slip
  const DRY_DAYS_LOST = 4; // this many days in a row bone dry and the crop is done

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

  // chance per day that each kind of weather shows up
  const CHANCE = {
    storm: { cool: 0.12, mild: 0.09, hot: 0.06 },
    heat: { cool: 0, mild: 0.04, hot: 0.11 },
    wind: { cool: 0.07, mild: 0.08, hot: 0.12 }
  };
  const BREAKDOWN = 0.025;
  const BREAK_NOTES = [
    "A tower's stuck in a wheel rut. The pivot sat all day.",
    "A power blip tripped the pivot. No water today.",
    "A drive motor quit. The pivot's stuck until it's fixed."
  ];
  const HEAT_NOTE = "Heat wave. The crop drinks a third more.";
  const WIND_NOTE = "Hot, windy day. Spray blows off and the crop drinks more.";

  /** One day's weather: what happens and how it changes rain, crop use and what the pivot gets down. */
  function dayWeather(rand, weather, spells) {
    const next = { ...spells };
    let note = "";
    if (next.broke === 0 && rand() < BREAKDOWN) { next.broke = 1 + Math.floor(rand() * 2); note = BREAK_NOTES[Math.floor(rand() * BREAK_NOTES.length)]; }
    if (next.heat === 0 && rand() < CHANCE.heat[weather]) { next.heat = 2 + Math.floor(rand() * 3); note = note || HEAT_NOTE; }
    const storm = rand() < CHANCE.storm[weather];
    const rain = storm ? Math.round((0.3 + rand() * 1.2) * 10) / 10 : 0;
    const windy = !storm && rand() < CHANCE.wind[weather];
    const broke = next.broke > 0, hot = next.heat > 0;
    next.broke = Math.max(0, next.broke - 1);
    next.heat = Math.max(0, next.heat - 1);
    const kind = broke ? "broke" : storm ? "storm" : hot ? "heat" : windy ? "windy" : "clear";
    if (storm) note = note || `Thunderstorm! ${rain.toFixed(1)} in of rain.`;
    else if (kind === "windy") note = note || WIND_NOTE; // the note always matches the day's icon
    return { spells: next, note, rain, broke, hot, windy, storm, kind };
  }

  /** Crop condition, 0 to 1: slides when the soil runs low, drops fast when it's bone dry, recovers when watered. */
  function nextCondition(cond, level, dry) {
    if (dry) return Math.max(0, cond - 0.22);
    if (level < STRESS) return Math.max(0, cond - 0.07 * (1 - level / STRESS) - 0.02);
    return Math.min(1, cond + 0.12);
  }

  /** Plays out SIM_DAYS of weather for a setup. Returns each day and how the crop came through. */
  function simulate(setup, seed = 1) {
    const rand = rng(seed);
    const crop = cropOf(setup.crop), weather = setup.weather || "mild";
    const cap = SOILS[setup.soil || "loam"];
    if (cap === undefined) throw new Error(`Unknown soil: ${setup.soil}`);
    const base = cropUse({ crop: setup.crop, weather }), put = applied(setup);
    let soil = cap * START_FULL, cond = 1, spells = { broke: 0, heat: 0 };
    let streak = 0, worstStreak = 0, dryDays = 0, stressDays = 0, streakHeat = false, worstHeat = false, low = { pct: 1, day: 0 };
    const days = [];

    for (let day = 1; day <= SIM_DAYS; day++) {
      const w = dayWeather(rand, weather, spells);
      spells = w.spells;
      // ordinary day-to-day swing, then heat, wind and rain on top
      const use = base * (0.88 + rand() * 0.24) * (w.hot ? 1.33 : 1) * (w.windy ? 1.15 : 1) * (w.storm ? 0.6 : 1);
      const water = w.broke ? 0 : put * (w.windy ? 0.85 : w.hot ? 0.93 : 1);
      const raw = soil + water + w.rain - use;
      const dry = raw <= 0;
      soil = Math.min(cap, Math.max(0, raw)); // rain past what the soil holds runs off
      const level = soil / cap;
      if (dry) {
        dryDays++; streak++; streakHeat = streakHeat || w.hot;
        if (streak > worstStreak) { worstStreak = streak; worstHeat = streakHeat; }
      } else { streak = 0; streakHeat = false; }
      if (!dry && level < STRESS) stressDays++;
      if (level < low.pct) low = { pct: level, day };
      cond = nextCondition(cond, level, dry);
      days.push({ day, kind: w.kind, note: w.note, rain: w.rain, use: round2(use), water: round2(water), soil: round2(soil), level, dry, cond });
    }
    const outcome = judge(setup, { dryDays, stressDays, worstStreak, low, sawHeat: worstHeat });
    return { days, cap, outcome };
  }

  const round2 = (n) => Math.round(n * 100) / 100;

  /** Rough share of yield lost: a little for each stressed day, a lot for each bone-dry one. */
  const yieldLoss = (stressDays, dryDays) => Math.min(100, Math.round(stressDays * 1.5 + dryDays * 5));
  const roundTo5 = (n) => Math.max(5, Math.round(n / 5) * 5);

  /** Turns how the soil held up into one of four endings. */
  function judge({ crop }, { dryDays, stressDays, worstStreak, low, sawHeat }) {
    const c = cropOf(crop), pct = Math.round(low.pct * 100), loss = yieldLoss(stressDays, dryDays);
    if (worstStreak >= DRY_DAYS_LOST + c.hardy) {
      return { level: "lost", loss: 100, title: "The crop burned up.",
        text: `The soil sat bone dry ${worstStreak} days in a row${sawHeat ? " through a heat wave" : ""}. The ${c.noun} wilted, went brown and never came back.` };
    }
    if (dryDays > 0 || loss >= 10) {
      const off = roundTo5(loss), [full, unit] = c.yield;
      const how = dryDays > 0 ? `ran out of water ${dryDays} ${dryDays === 1 ? "day" : "days"}` : `spent ${stressDays} days short of water`;
      return { level: "thirsty", loss: off, title: "Thirsty crop.",
        text: `The ${c.noun} ${how} and pulled through, but figure yield is down about ${off}%. That's around ${Math.round((full * off) / 100)} ${unit}.` };
    }
    if (stressDays > 0) {
      return { level: "tight", loss, title: "Made it, barely.",
        text: `Soil moisture dropped to ${pct}% on day ${low.day}. The ${c.noun} curled up a few afternoons but hung on.` };
    }
    return { level: "thrived", loss: 0, title: "Bumper crop!",
      text: `${pct >= 100 ? "Soil stayed full of water all month" : `Soil moisture never dropped below ${pct}%`}. Tall, green ${c.noun} all month, on track for ${c.yield[0]} ${c.yield[1]}.` };
  }

  const api = { LIMITS, CROPS, SOILS, WEATHERS, SIM_DAYS, STRESS, EFFICIENCY, applied, cropUse, gpmPerAcre, verdict, simulate, yieldLoss };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PivotLab = api;

  // ----- page wiring (lab.html only) -----
  if (typeof document === "undefined") return;
  const panel = document.getElementById("labPivot");
  if (!panel || !root.PivotScene) return;

  const $ = (id) => document.getElementById(id);
  const scene = root.PivotScene.create($("pvSvg"));
  let state = { crop: "corn", acres: 125, gpm: 800, weather: "mild", soil: "loam" };

  /** How the field looks before a run: green when the pivot keeps up, browning as it falls behind. */
  const previewHealth = (ratio) => Math.max(0.08, Math.min(1, (ratio - 0.62) / 0.36));

  function render() {
    const s = state, put = applied(s), use = cropUse(s), v = verdict(put, use);
    Object.keys(CROPS).forEach((k) => $("pv-" + k).setAttribute("aria-pressed", String(k === s.crop)));
    $("pvAcresVal").textContent = s.acres + " acres";
    $("pvGpmVal").textContent = s.gpm.toLocaleString("en-US") + " gpm";
    $("pvPutOut").textContent = inches(put);
    $("pvUseOut").textContent = inches(use);
    const verdictEl = $("pvVerdict");
    verdictEl.textContent = v.text;
    verdictEl.className = "lab-verdict " + v.level;
    $("pvTip").textContent = `That's ${gpmPerAcre(s).toFixed(1)} gallons a minute per acre. ${CROPS[s.crop].tip} ` +
      `${SOIL_NAMES[s.soil]} holds about ${SOILS[s.soil]} inches the roots can reach. That's the cushion for a hot spell or a breakdown.`;
    const health = previewHealth(v.ratio);
    scene.set({
      crop: s.crop, acres: s.acres, gpm: s.gpm, flow: put / 0.4, health, moisture: Math.min(0.9, health * 0.85),
      weather: "clear", ending: "", day: 0
    });
  }

  // ----- the 30-day sim, played back a day at a time on the diagram -----
  const ICON_FOR = { clear: "sun", storm: "storm", heat: "heat", windy: "wind", broke: "wrench" };
  const RESULT_ICON = { thrived: "corn", tight: "gauge", thirsty: "drop", lost: "heat" };
  const board = root.SimBoard.create("pv", { idle: "Run a 30-day sim", scene: $("pvSvg") });
  const stopSim = () => board.stop();

  function showDay(d) {
    scene.set({ flow: d.water / 0.4, health: d.cond, moisture: d.level, weather: d.kind, day: d.day, ending: "" });
  }

  function showResult(run) {
    const o = run.outcome;
    board.result({ ...o, icon: o.level === "thrived" ? state.crop : RESULT_ICON[o.level] }, `${SIM_DAYS} days later`);
    const last = run.days[run.days.length - 1];
    scene.set({ ending: o.level, weather: o.level === "lost" ? "heat" : "clear", flow: o.level === "lost" ? 0 : last.water / 0.4 });
    if (o.level === "lost") board.catastrophe();
    else if (o.level !== "thirsty") board.celebrate();
  }

  function runSim() {
    const run = simulate(state, (Math.random() * 2 ** 32) >>> 0);
    board.play(run.days, {
      cell: (d) => ({ kind: d.kind, icon: ICON_FOR[d.kind], level: d.level, bad: d.dry }),
      head: (d) => `Day ${d.day} of ${SIM_DAYS}`,
      note: (d) => d.note || (d.dry ? "The soil is bone dry." : d.level < STRESS ? "The crop is curling up for water." : ""),
      onStep: showDay,
      onDone: () => showResult(run)
    });
  }

  $("pvRun").addEventListener("click", runSim);
  document.addEventListener("labmode", () => { stopSim(); render(); }); // switching sims stops a run and resets the picture

  const set = (patch) => { stopSim(); state = { ...state, ...patch }; render(); };
  Object.keys(CROPS).forEach((k) => $("pv-" + k).addEventListener("click", () => set({ crop: k })));
  [["acres", "pvAcres"], ["gpm", "pvGpm"]].forEach(([k, id]) => $(id).addEventListener("input", (e) => set({ [k]: Number(e.target.value) })));
  $("pvWeather").addEventListener("change", (e) => set({ weather: e.target.value }));
  $("pvSoil").addEventListener("change", (e) => set({ soil: e.target.value }));
  render();
})(typeof window !== "undefined" ? window : globalThis);
