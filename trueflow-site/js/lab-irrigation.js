/* Water Lab, irrigation well: can this well and pump keep up with the pivots all season
   without pumping the well down and burning up the pump?
   The math at the top is pure (runs under `node --test`); the page wiring below only runs on lab.html.
   Numbers are rough western Kansas (Ogallala) rules of thumb, not a well test. */
(function (root) {
  "use strict";

  const LIMITS = Object.freeze({ sat: [20, 250], gpm: [300, 1500], pivots: [1, 3], dtw: [100, 400] });
  const WEATHERS = ["cool", "mild", "drought"];

  // What the formation gives: Ogallala sand and gravel yields roughly 7 to 8 gpm per foot of saturated thickness
  const YIELD_PER_FT = 8;
  const YIELD_CAP = 1800;
  // Pumping right at the well's yield draws the water in the well down about 65% of the saturated thickness,
  // which works out to a specific capacity near 12 gpm per foot of drawdown
  const DRAW_SHARE = 0.65;
  const INTAKE_FT = 15; // the pump intake hangs about 15 ft off the bottom of the aquifer
  const CUT_FT = 8; // a careful irrigator throttles back once the water gets this close to the intake
  const MIN_THROTTLE = 0.75; // throttle a submersible back much further and it runs hot anyway
  const PIVOT_GPM = 850; // 125 acres of corn in a hot week, after evaporation and drift
  const PIVOT_HEAD_FT = 70; // low-pressure drops at about 25 psi, plus pipe friction
  const PUMP_EFFICIENCY = 0.7;
  const MOTOR_EFFICIENCY = 0.92;
  const KWH_PRICE = 0.1; // dollars, a typical rural irrigation rate
  const HP_SIZES = [15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450];

  const clamp = (n, [lo, hi]) => Math.max(lo, Math.min(hi, Number(n) || 0));
  const weatherOf = (w) => {
    if (!WEATHERS.includes(w)) throw new Error(`Unknown weather: ${w}`);
    return w;
  };

  /** Gallons per minute the formation can give the well long term. */
  const wellYield = (sat) => Math.min(YIELD_CAP, Math.round(YIELD_PER_FT * clamp(sat, LIMITS.sat)));

  /** Gallons per minute for each foot the water in the well is drawn down. */
  const specificCapacity = (sat) => wellYield(sat) / (DRAW_SHARE * clamp(sat, LIMITS.sat));

  /** Feet of water between the static level and the pump intake: all the drawdown you get. */
  const available = (sat) => clamp(sat, LIMITS.sat) - INTAKE_FT;

  /** Smallest standard motor that lifts `gpm` from `pumpingLevel` ft and runs the pivots. */
  function horsepower(gpm, pumpingLevel) {
    const hp = (gpm * (pumpingLevel + PIVOT_HEAD_FT)) / (3960 * PUMP_EFFICIENCY);
    return { hp, motor: HP_SIZES.find((s) => s >= hp) ?? HP_SIZES.at(-1) };
  }

  /** Dollars of electricity for a month running `duty` of the time (0..1) at `hp` brake horsepower. */
  const powerBill = (hp, duty = 1) => Math.round((hp * 0.746 / MOTOR_EFFICIENCY) * 730 * duty * KWH_PRICE);

  // ----- the season: 16 weeks, June 1 through September 20 -----
  const WEEKS = 16;
  const START = Date.UTC(2026, 5, 1); // only used for month and day labels
  const weekLabel = (i) => new Date(START + i * 7 * 864e5).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  // how thirsty the corn is by week: small in June, peaks at tassel in mid-July, tapers as it dents
  const CROP = [0.4, 0.5, 0.6, 0.75, 0.9, 1, 1, 1, 1, 0.95, 0.85, 0.75, 0.6, 0.45, 0.3, 0.2];
  // what a week's weather does to how hard the pivots run (rain weeks they mostly sit)
  const WEEK_FACTOR = { rain: 0.08, cool: 0.6, normal: 0.75, hot: 1, heat: 1.15 };
  // chance of each kind of week by the kind of summer
  const ODDS = {
    cool: { rain: 0.26, cool: 0.34, normal: 0.3, hot: 0.1, heat: 0 },
    mild: { rain: 0.17, cool: 0.16, normal: 0.4, hot: 0.2, heat: 0.07 },
    drought: { rain: 0.04, cool: 0.04, normal: 0.24, hot: 0.4, heat: 0.28 }
  };
  // feet per week the neighbors' wells pull the water table down (interference), in a typical week
  const NEIGHBORS_FT = { cool: 0.4, mild: 0.6, drought: 1 };
  const NOTES = {
    rain: "A good rain. The pivots shut off and the well comes back up.",
    heat: "Heat wave. The pivots run flat out.",
    cool: "Cool and cloudy. The corn takes it easy."
  };

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

  /** Feet of water left over the pump intake while pumping `q` gpm, given how the season has worn on the well. */
  function margin(sat, q, { regional = 0, dewater = 0, stress = 1 } = {}) {
    return available(sat) - regional - dewater - (q / specificCapacity(sat)) * (0.8 + 0.4 * stress);
  }

  /** Cleans up a setup from the controls. */
  function normalize(s) {
    return {
      sat: clamp(s.sat ?? 120, LIMITS.sat), gpm: clamp(s.gpm ?? 800, LIMITS.gpm),
      pivots: Math.round(clamp(s.pivots ?? 1, LIMITS.pivots)), dtw: clamp(s.dtw ?? 180, LIMITS.dtw),
      weather: weatherOf(s.weather ?? "mild")
    };
  }

  /**
   * The quick look while dragging: a hot week late in the season, pump running flat out.
   * Returns the well's yield, peak demand, water left over the pump, horsepower and a rough power bill.
   */
  function outlook(setup) {
    const s = normalize(setup), y = wellYield(s.sat), sc = specificCapacity(s.sat);
    const peak = Math.round(s.pivots * PIVOT_GPM * (s.weather === "cool" ? 0.85 : s.weather === "drought" ? 1.1 : 1));
    const regional = NEIGHBORS_FT[s.weather] * 0.8 * 10; // ten weeks in, at a typical pace
    const dewaterAt = (q) => (q > y ? ((q - y) / sc) * 0.25 * 6 : 0); // six weeks of pumping past the yield
    const duty = Math.min(1, peak / s.gpm); // a bigger pump runs fewer hours, so the cone spreads less
    const left = margin(s.sat, s.gpm, { regional, dewater: dewaterAt(s.gpm), stress: duty });
    const drawdown = available(s.sat) - left - regional; // in the well, below the (lowered) water table
    const level = s.dtw + regional + drawdown; // pumping water level, ft below ground
    const { hp, motor } = horsepower(s.gpm, Math.min(level, s.dtw + available(s.sat))); // it can't lift from below its intake
    const throttled = margin(s.sat, s.gpm * MIN_THROTTLE, { regional, dewater: dewaterAt(s.gpm * MIN_THROTTLE), stress: 1 });
    return { yield: y, peak, left, throttled, drawdown, regional, level, hp, motor, bill: powerBill(hp, duty), duty, available: available(s.sat) };
  }

  /** The pump size this setup should have: what the pivots want in a hot week, but never more than the well gives. */
  function rightSize(setup) {
    const s = normalize(setup), o = outlook(s), fmt = (n) => n.toLocaleString("en-US");
    // the biggest pump, in 50 gpm steps, that still leaves water over the intake at the peak
    let gpm = Math.round(Math.min(o.peak, o.yield) / 50) * 50;
    while (gpm > 100 && outlook({ ...s, gpm }).left < CUT_FT) gpm -= 50;
    const text = gpm >= o.peak * 0.95
      ? `Right size: a pump around ${fmt(gpm)} gpm. That covers the pivots, and the well can give ${fmt(o.yield)}.`
      : `Right size: about ${fmt(gpm)} gpm, about what this well can safely give. The pivots want ${fmt(o.peak)}, so put fewer acres or a lower-water crop under it.`;
    return { gpm, text };
  }

  /** What the outlook means in plain words: ok, close or short. */
  function verdict(setup) {
    const s = normalize(setup), o = outlook(s), ft = Math.round(o.left);
    if (o.throttled <= 0) return { level: "short", text: "This pump pulls the well down past its intake, even throttled back. It'll suck air." };
    if (o.left < CUT_FT) return { level: "short", text: o.left <= 0 ? "Flat out, this pump would pull the water below the intake. You'll be throttling it back all summer."
      : `Only about ${ft} ft of water over the pump at the peak. You'll be throttling it back.` };
    const shortBy = o.peak - s.gpm;
    const want = `${s.pivots === 1 ? "the pivot wants" : `${s.pivots} pivots want`} about ${o.peak.toLocaleString("en-US")} gpm in a hot spell`;
    if (shortBy > o.peak * 0.2) return { level: "short", text: `The well's fine, but ${want}. The pump comes up ${Math.round(shortBy / 10) * 10} gpm short.` };
    if (shortBy > o.peak * 0.08) return { level: "close", text: `The well's fine, but ${want}, a bit more than this pump gives. Expect a few short weeks.` };
    if (o.left < 15) return { level: "close", text: `Holds, but by August there's only about ${ft} ft of water over the pump.` };
    if (s.gpm > o.yield) return { level: "close", text: `The pump asks for more than the well gives (${o.yield.toLocaleString("en-US")} gpm). The well slowly pumps down.` };
    return { level: "ok", text: `Keeps up, with about ${ft} ft of water over the pump at the peak.` };
  }

  /** Picks a week's weather; heat waves like to hang around a second week. */
  function pickWeather(odds, prev, rand) {
    if (prev === "heat" && rand() < 0.4) return "heat";
    let r = rand();
    for (const [k, p] of Object.entries(odds)) { if (r < p) return k; r -= p; }
    return "normal";
  }

  /**
   * Plays out WEEKS of summer for a setup. Returns each week and how the well, pump and corn came through.
   * Each week the pivots want water, the pump runs as many hours as it takes, the water in the well draws
   * down, and the neighbors pull the water table down a little more. Too close to the intake, the irrigator
   * throttles back; if even that can't keep water over the intake, the pump sucks air and burns up.
   */
  function simulate(setup, seed = 1) {
    const s = normalize(setup), rand = rng(seed);
    const y = wellYield(s.sat), sc = specificCapacity(s.sat), avail = available(s.sat);
    let regional = 0, dewater = 0, stress = 0, weather = "normal", deadWeek = 0, cutWeeks = 0;
    let wanted = 0, got = 0, low = { left: avail, week: 0 };
    const weeks = [];

    for (let i = 0; i < WEEKS; i++) {
      weather = pickWeather(ODDS[s.weather], weather, rand);
      const wf = WEEK_FACTOR[weather];
      const want = s.pivots * PIVOT_GPM * CROP[i] * wf * (0.95 + rand() * 0.1); // gpm, around the clock
      regional += NEIGHBORS_FT[s.weather] * (weather === "rain" ? 0.3 : wf);

      let q = 0, cut = false, air = false;
      if (deadWeek === 0 && want > s.gpm * 0.15) {
        q = s.gpm;
        const wear = { regional, dewater, stress: 0.6 * stress + 0.4 * Math.min(1, want / q) };
        if (margin(s.sat, q, wear) < CUT_FT) { // throttle back just enough to keep CUT_FT over the intake
          const room = avail - regional - dewater - CUT_FT;
          q = Math.max(s.gpm * MIN_THROTTLE, Math.min(s.gpm, (room * sc) / (0.8 + 0.4 * wear.stress)));
          cut = true;
        }
        if (margin(s.sat, q, wear) <= 0) { air = true; deadWeek = i + 1; }
      }
      const duty = q > 0 && !air ? Math.min(1, want / q) : 0;
      stress = 0.6 * stress + 0.4 * duty;
      // pumping harder than the formation gives slowly dewaters the sand around the well; rest lets it recover
      dewater = q > y ? dewater + ((q - y) / sc) * 0.25 * duty : dewater * (0.55 + 0.45 * duty);
      const left = margin(s.sat, air ? s.gpm : q, { regional, dewater, stress });
      const delivered = q * duty;
      wanted += want; got += Math.min(want, delivered);
      if (cut) cutWeeks++;
      if (!air && deadWeek === 0 && q > 0 && left < low.left) low = { left, week: i + 1 };
      const note = air ? "The water drops below the intake. The pump sucks air!" :
        deadWeek ? "No pump. The pivots sit still and the corn bakes." :
        cut ? "Water's close to the intake. Throttling the pump back." :
        delivered < want * 0.85 && want > 100 ? "The pump can't keep up. The corn's coming up short." : NOTES[weather] || "";
      weeks.push({
        week: i + 1, date: weekLabel(i), weather, want: Math.round(want), q: Math.round(q), duty, delivered: Math.round(delivered),
        regional, dewater, drawdown: deadWeek && !air ? 0 : avail - Math.max(0, left) - regional, left: Math.max(0, left),
        level: deadWeek ? 0 : Math.min(1, Math.max(0, left) / Math.min(avail, 60)), cut, air, short: want > 100 && delivered < want * 0.85, dead: deadWeek > 0, crop: Math.min(1, got / Math.max(1, wanted)), note
      });
    }
    const share = got / Math.max(1, wanted);
    return { weeks, available: avail, yield: y, outcome: judge(s, { deadWeek, cutWeeks, share, low, weeks }) };
  }

  /** Turns how the season went into one of four endings. */
  function judge(s, { deadWeek, cutWeeks, share, low, weeks }) {
    const pct = Math.round(share * 100), ft = Math.round(low.left);
    if (deadWeek) {
      const w = weeks[deadWeek - 1];
      return { level: "lost", week: deadWeek, share, title: "KA-CHUNK. Pump's toast.",
        text: `The week of ${w.date} the water dropped below the intake. The pump sucked air, overheated and burned up, and the pivots sat dry ${deadWeek === 1 ? "all summer" : `the last ${WEEKS - deadWeek + 1} weeks`}.` };
    }
    if (share < 0.85) return { level: "thirsty", share, title: "The corn came up short.",
      text: cutWeeks ? `You had to throttle the pump back ${cutWeeks} ${cutWeeks === 1 ? "week" : "weeks"} to save it, and the corn only got ${pct}% of the water it wanted. Expect a short crop.`
        : `The well held up fine, but the pump only covered ${pct}% of what the pivots wanted. Too many acres for this pump.` };
    if (cutWeeks || ft < 15 || share < 0.92) return { level: "tight", share, title: "Made it, barely.",
      text: cutWeeks ? `You throttled back ${cutWeeks} ${cutWeeks === 1 ? "week" : "weeks"} and got the corn ${pct}% of its water. The well was nearly sucking air.`
        : `The corn got ${pct}% of its water, but by ${weeks[low.week - 1].date} there was only ${ft} ft of water over the pump.` };
    return { level: "thrived", share, title: "Bin-buster season!",
      text: `The well never got closer than ${ft} ft to the pump and the corn got ${pct}% of the water it wanted.` };
  }

  const api = { LIMITS, WEATHERS, WEEKS, PIVOT_GPM, INTAKE_FT, wellYield, specificCapacity, available, horsepower, powerBill, margin, outlook, verdict, rightSize, simulate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.IrrigationLab = api;
})(typeof window !== "undefined" ? window : globalThis);

/* Page wiring for the irrigation well panel (lab.html only), in its own IIFE so the math above stays pure. */
(function (root) {
  "use strict";
  if (typeof document === "undefined") return;
  const panel = document.getElementById("labIrrigation");
  if (!panel) return;
  const L = root.IrrigationLab;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");

  const scene = root.IrrigationScene.create($("iwSvg"));
  let state = { sat: 120, gpm: 800, pivots: 1, dtw: 180, weather: "mild" };
  const SKY = { cool: "cool", mild: "clear", drought: "hot" };

  /** A tip that fits whatever is the weak link right now. */
  function tip(s, o) {
    if (s.gpm > o.yield) return "Rule of thumb: Ogallala sand and gravel gives about 8 gpm for every foot of water left. Size the pump to the well, not to the pivot.";
    if (o.peak > s.gpm * 1.12) return "A 125-acre corn pivot wants 800 to 900 gpm in a hot week. Split pivots between wells, or put a lower-water crop like wheat or milo under one.";
    if (o.left < 15) return "A low-water shutoff kills the pump before it sucks air. Cheap insurance on a well this close.";
    return "Low-pressure drops and soil moisture probes stretch every gallon, and a low-water shutoff protects the pump if the well ever draws down.";
  }

  function render() {
    const s = state, o = L.outlook(s), v = L.verdict(s);
    $("iwSatVal").textContent = s.sat + " ft";
    $("iwGpmVal").textContent = fmt(s.gpm) + " gpm";
    $("iwDtwVal").textContent = s.dtw + " ft";
    [1, 2, 3].forEach((n) => $("iwP" + n).setAttribute("aria-pressed", String(n === s.pivots)));
    $("iwYieldOut").textContent = fmt(o.yield);
    $("iwPumpOut").textContent = fmt(s.gpm);
    $("iwPeakOut").textContent = fmt(o.peak);
    $("iwFitOut").textContent = L.rightSize(s).text;
    $("iwLeftOut").textContent = o.left > 0 ? Math.round(o.left) + " ft" : "0 ft, sucks air";
    $("iwHpOut").textContent = o.motor + " HP";
    $("iwBillOut").textContent = "$" + fmt(Math.round(o.bill / 100) * 100);
    const verdictEl = $("iwVerdict");
    verdictEl.textContent = v.text;
    verdictEl.className = "lab-verdict " + v.level;
    $("iwTip").textContent = tip(s, o);
    $("iwBook").href = "contact.html?" + new URLSearchParams({ need: o.left < 15 ? "c2" : "c4" });
    scene.set({
      sat: s.sat, dtw: s.dtw, gpm: s.gpm, q: s.gpm, pivots: s.pivots, weather: SKY[s.weather],
      drawdown: Math.max(0, o.drawdown), regional: o.regional, grow: 0.8, health: Math.min(1, s.gpm / o.peak) ** 2, spray: 1,
      mode: o.throttled <= 0 ? "air" : "run"
    });
  }

  // ----- the season sim: play the summer back a week at a time on the diagram -----
  const KIND = { rain: "storm", cool: "cloudy", normal: "clear", hot: "heat", heat: "heat" };
  const ICON = { rain: "rain", cool: "cloud", normal: "sun", hot: "heat", heat: "heat" };
  const WEATHER = { rain: "rain", cool: "cool", normal: "clear", hot: "hot", heat: "heat" };
  const RESULT_ICON = { thrived: "corn", tight: "gauge", thirsty: "drop", lost: "pump" };
  const FACTS = [
    "The Ogallala aquifer lies under parts of eight states, from South Dakota to Texas.",
    "Corn in northwest Kansas needs about 15 inches of irrigation in an average year, on top of the rain.",
    "The Kansas Geological Survey figures a 400 gallon-a-minute well needs about 35 to 85 feet of wet sand and gravel.",
    "A low-water shutoff turns the pump off before it sucks air and burns up.",
    "A big irrigation pump can take a 100 horsepower motor to lift the water from a deep well."
  ];
  const board = root.SimBoard.create("iw", { idle: "Play a summer", scene: $("iwSvg") });

  function showWeek(w) {
    scene.set({
      weather: WEATHER[w.weather], q: w.dead ? 0 : w.q, drawdown: w.dead ? 999 : w.drawdown, regional: w.regional, // a dead pump sits in the air it sucked
      grow: 0.3 + (w.week / L.WEEKS) * 0.7, health: Math.max(0, Math.min(1, (w.crop - 0.6) / 0.4)),
      spray: w.q > 0 && !w.dead ? 1 : 0, mode: w.dead ? "dead" : "run"
    });
  }

  function showResult(run) {
    const o = run.outcome, last = run.weeks[run.weeks.length - 1];
    board.result({ ...o, icon: RESULT_ICON[o.level], fact: root.SimBoard.pick(FACTS) }, "Season's over");
    const survived = o.level === "thrived" || o.level === "tight", lost = o.level === "lost";
    // survived: water's on and the crop's green; thirsty: still pumping flat out over wilted corn; lost: the wreck
    scene.set({
      mode: lost ? "dead" : survived ? "party" : "run",
      weather: survived ? "clear" : lost ? WEATHER[last.weather] : "hot",
      grow: 1, spray: lost ? 0 : 1, q: lost ? 0 : state.gpm, drawdown: lost ? 999 : Math.max(last.drawdown, L.outlook(state).drawdown * 0.8)
    });
    if (o.level === "lost") board.catastrophe(); else if (survived) board.celebrate();
  }

  function runSim() {
    const run = L.simulate(state, (Math.random() * 2 ** 32) >>> 0);
    board.play(run.weeks, {
      stepMs: 520,
      cell: (w) => ({ kind: KIND[w.weather], icon: ICON[w.weather], level: w.level, bad: w.dead || w.cut || w.short }),
      head: (w) => `Week ${w.week} of ${L.WEEKS} · ${w.date}`,
      note: (w) => w.note,
      onStep: showWeek,
      onDone: () => showResult(run)
    });
  }

  const set = (patch) => { board.stop(); state = { ...state, ...patch }; render(); };
  $("iwRun").addEventListener("click", runSim);
  document.addEventListener("labmode", () => { board.stop(); render(); }); // switching sims stops a run and resets the picture
  [["sat", "iwSat"], ["gpm", "iwGpm"], ["dtw", "iwDtw"]].forEach(([k, id]) =>
    $(id).addEventListener("input", (e) => set({ [k]: Number(e.target.value) })));
  [1, 2, 3].forEach((n) => $("iwP" + n).addEventListener("click", () => set({ pivots: n })));
  $("iwWeather").addEventListener("change", (e) => set({ weather: e.target.value }));
  render();
})(typeof window !== "undefined" ? window : globalThis);
