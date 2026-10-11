/* Water Lab: build a well and see if it keeps up with the herd.
   The math at the top is pure (runs under `node --test`); the page wiring below only runs on lab.html.
   Numbers are rough rules of thumb for a typical setup, not a quote. */
(function (root) {
  "use strict";

  const LIMITS = Object.freeze({ depth: [40, 600], wind: [0, 30], sun: [2, 7], herd: [0, 400] });
  const GAL_PER_HEAD = Object.freeze({ cool: 10, mild: 15, hot: 20 }); // gallons per cow per day
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

  /** Gallons per day the herd (and optionally the house) drinks. */
  function demand({ herd, season = "mild", house = false }) {
    const perHead = GAL_PER_HEAD[season];
    if (perHead === undefined) throw new Error(`Unknown season: ${season}`);
    return Math.round(clamp(herd, LIMITS.herd) * perHead + (house ? HOUSE_GAL_PER_DAY : 0));
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
    if (need === 0) return { level: "ok", ratio: 1, text: "Add some cattle to see if this well keeps up." };
    const ratio = galPerDay / need;
    if (ratio >= 1.25) return { level: "ok", ratio, text: "Keeps up with room to spare." };
    if (ratio >= 1) return { level: "close", ratio, text: "Just keeps up. A storage tank gives you a cushion for still or cloudy days." };
    return { level: "short", ratio, text: `Falls short by about ${(need - galPerDay).toLocaleString("en-US")} gallons a day.` };
  }

  const api = { LIMITS, GAL_PER_HEAD, POWERS, windFactor, demand, supply, pumpHp, verdict };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WaterLab = api;

  // ----- page wiring (lab.html only) -----
  if (typeof document === "undefined") return;
  const lab = document.getElementById("lab");
  if (!lab) return;

  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TIPS = {
    windmill: "Windmills run free on Kansas wind, but a still week drains the tank. Pair one with a big storage tank.",
    solar: "Solar pumps run all day in the sun with no power bill. A float switch shuts them off when the tank is full.",
    electric: "An electric submersible pumps whenever you need it, as long as there's power at the well."
  };
  const NEED = { windmill: "c6", solar: "c6", electric: "c4" };
  const DEPTH_Y = (d) => 108 + (clamp(d, LIMITS.depth) / LIMITS.depth[1]) * 232; // ground is y=108, 600 ft is y=340
  let state = { power: "windmill", depth: 220, wind: 12, sun: 5.5, herd: 60, season: "mild", house: false };

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
    $("herdVal").textContent = s.herd + " head";

    $("supplyOut").textContent = out.galPerDay.toLocaleString("en-US");
    $("needOut").textContent = need.toLocaleString("en-US");
    const verdictEl = $("verdict");
    verdictEl.textContent = v.text;
    verdictEl.className = "lab-verdict " + v.level;
    $("labTip").textContent = TIPS[s.power] + (out.hp ? ` At ${s.depth} ft that's about a ${out.hp} HP pump.` : "");
    $("labBook").href = "contact.html?" + new URLSearchParams({ need: NEED[s.power] });

    // scene
    const y = DEPTH_Y(s.depth);
    $("casing").setAttribute("height", (y - 100).toFixed(0));
    $("pump").setAttribute("y", (y - 22).toFixed(0));
    $("riser").setAttribute("y2", (y - 22).toFixed(0));
    $("depthTag").setAttribute("y", (y + 4).toFixed(0));
    $("depthTag").textContent = s.depth + " FT";
    const fill = Math.max(0, Math.min(1, need ? out.galPerDay / need : 1));
    $("tankWater").setAttribute("height", (26 * fill).toFixed(1));
    $("tankWater").setAttribute("y", (104 - 26 * fill).toFixed(1));
    const herdShown = Math.min(8, Math.ceil(s.herd / 50));
    lab.querySelectorAll(".cow").forEach((c, i) => c.classList.toggle("on", i < herdShown));
    $("sunDisc").setAttribute("cy", (66 - (s.sun - 2) * 8).toFixed(0));

    // motion: blade spin follows the wind, water speed follows the flow
    const flowing = out.galPerDay > 0;
    lab.style.setProperty("--spin", windFactor(s.wind) > 0 ? (2.4 - 1.9 * windFactor(s.wind)).toFixed(2) + "s" : "0s");
    lab.style.setProperty("--flow", Math.max(0.4, 3 - out.gpm / 4).toFixed(2) + "s");
    lab.classList.toggle("flowing", flowing && !reduce);
    lab.classList.toggle("spinning", s.power === "windmill" && windFactor(s.wind) > 0 && !reduce);
  }

  const set = (patch) => { state = { ...state, ...patch }; render(); };
  POWERS.forEach((p) => $("pw-" + p).addEventListener("click", () => set({ power: p })));
  [["depth", "labDepth"], ["wind", "labWind"], ["sun", "labSun"], ["herd", "labHerd"]].forEach(([k, id]) =>
    $(id).addEventListener("input", (e) => set({ [k]: Number(e.target.value) })));
  $("labSeason").addEventListener("change", (e) => set({ season: e.target.value }));
  $("labHouse").addEventListener("change", (e) => set({ house: e.target.checked }));
  render();
})(typeof window !== "undefined" ? window : globalThis);
