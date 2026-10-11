/* Water Lab diagram animation. lab.js decides the numbers; this file only draws them.
   Every moving value eases toward its target, so changes glide instead of jumping. */
(function (root) {
  "use strict";
  const { svg, approach, loop } = root.Motion;

  const GROUND = 108, AQUIFER = 166, WELL_X = 200;
  const SPOUT = [280, 71];
  const TANK = { left: 265, right: 339, bottom: 104, depth: 26 };
  const depthY = (ft) => GROUND + (ft / 600) * 232;
  const rad = (deg) => (deg * Math.PI) / 180;

  // where each animal stands, in the order they arrive: the first two drink at the tank
  const SPOTS = [
    { x: 354, face: -1, s: 1, drink: true }, { x: 245, face: 1, s: 1, drink: true },
    { x: 60, face: 1, s: 1 }, { x: 104, face: -1, s: 1 }, { x: 22, face: 1, s: 0.8, y: 101 },
    { x: 380, face: -1, s: 0.85, y: 101 }, { x: 140, face: 1, s: 0.8, y: 101 }, { x: 88, face: 1, s: 0.75, y: 96 }
  ];
  const GRASS_X = [8, 34, 52, 78, 120, 150, 170, 226, 252, 300, 330, 366, 392];
  const DROPS = 18;

  function buildWheel(g) {
    svg("circle", { cx: 0, cy: 0, r: 21.5, fill: "none", stroke: "var(--ink)", "stroke-width": 1.2 }, g);
    for (let i = 0; i < 18; i++) {
      const a = (i * 360) / 18, p = (r, d) => `${(r * Math.cos(rad(a + d))).toFixed(2)} ${(r * Math.sin(rad(a + d))).toFixed(2)}`;
      svg("path", { d: `M${p(6, -3)}L${p(21, -7)}L${p(21, 6)}L${p(6, 3)}Z`, class: "blade" }, g);
    }
    svg("circle", { cx: 0, cy: 0, r: 13, fill: "none", stroke: "var(--ink)", "stroke-width": 0.8 }, g);
    svg("circle", { cx: 0, cy: 0, r: 3.2, fill: "var(--ink)" }, g);
  }

  function create(svgEl) {
    const $ = (id) => svgEl.querySelector("#" + id);
    const el = Object.fromEntries(["wheel", "tail", "rod", "sun", "sunRays", "clouds", "ripples", "drawdown", "casing",
      "casingClip", "casingWater", "pipe", "drops", "pumpG", "pump", "pumpBands", "depthTag", "stream", "tankWater",
      "splash", "herd", "grass", "sheen", "wirePulse", "led", "intake", "skyShade", "skyHeat", "bolt", "rain"].map((id) => [id, $(id)]));

    buildWheel(el.wheel);
    for (let i = 0; i < 8; i++) svg("line", { x1: 0, y1: -15, x2: 0, y2: -19, stroke: "var(--signal)", "stroke-width": 2, "stroke-linecap": "round", transform: `rotate(${i * 45})` }, el.sunRays);
    const clouds = [{ x: 40, y: 22, s: 1 }, { x: 250, y: 12, s: 0.75 }, { x: 160, y: 46, s: 0.6 }].map((c) =>
      ({ ...c, node: svg("path", { d: "M0 10a7 7 0 0 1 7-7 9 9 0 0 1 16-3 7 7 0 0 1 11 4 6 6 0 0 1 2 12H3a5 5 0 0 1-3-6z" }, el.clouds) }));
    const ripples = [[30, 200], [300, 214], [90, 246], [250, 280], [40, 310], [330, 330]].map(([x, y], i) =>
      ({ x, y, ph: i * 1.7, node: svg("rect", { x, y, width: 44, height: 1.6, rx: 0.8 }, el.ripples) }));
    const drops = Array.from({ length: DROPS }, () => svg("circle", { r: 1.7, class: "drop-dot" }, el.drops));
    const rings = [0, 0.33, 0.66].map((off) => ({ off, node: svg("ellipse", { cx: SPOUT[0], rx: 0, ry: 0, fill: "none", stroke: "#fff", "stroke-width": 1 }, el.splash) }));
    // specks of groundwater drawn in toward the pump intake
    const specks = Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * Math.PI * 2 + 0.3, off: (i * 0.37) % 1, node: svg("circle", { r: 1.1, class: "intake" }, el.intake) }));
    const rain = Array.from({ length: 18 }, (_, i) => ({ x: (i * 53) % 400, off: (i * 0.37) % 1, node: svg("line", { y1: 0, y2: 7 }, el.rain) }));
    let herd = [], kind = "";
    const restock = (next) => { el.herd.replaceChildren(); herd = SPOTS.map((spot) => root.LabAnimals.create(el.herd, spot, next)); kind = next; };
    const buzzards = root.LabAnimals.vultures(svg("g", { class: "vultures" }, el.clouds));
    const grass = GRASS_X.map((x, i) => ({ x, ph: i * 0.9, node: svg("path", { d: "M0 0q-1-5-4-7M0 0q0-6 1-9M0 0q1-4 4-6", transform: `translate(${x} ${GROUND})` }, el.grass) }));

    let target = { power: "windmill", depth: 220, wind: 12, windFactor: 0.67, sun: 5.5, gpm: 3, level: 0.9, herd: 2, animal: "cattle", weather: "clear", down: 0, death: "fall" };
    const cur = { depthY: depthY(220), spin: 0, angle: 0, flow: 0, gpm: 0, level: 0.5, sunY: 40, dip: 0, phase: 0, wind: 12, rod: 0, dark: 0, heat: 0, rain: 0 };

    function frame(dt, t, still) {
      const T = target, windmill = T.power === "windmill";
      // eased values: depth glides, the wheel has inertia, the tank fills and drains gradually
      cur.depthY = approach(cur.depthY, depthY(T.depth), dt, 6);
      cur.spin = approach(cur.spin, windmill ? T.windFactor * 300 + (T.wind > 3 ? 20 : 0) : 0, dt, 0.9);
      cur.angle = (cur.angle + cur.spin * dt) % 1080; // 1080 = one full pump stroke cycle (3 turns)
      cur.wind = approach(cur.wind, T.wind, dt, 2);
      const stroke = windmill ? Math.max(0, Math.sin(rad(cur.angle) / 3)) : 1; // a windmill lifts water on each upstroke
      cur.flow = approach(cur.flow, T.gpm > 0 ? 1 : 0, dt, 2.5);
      cur.gpm = approach(cur.gpm, T.gpm, dt, 3);
      cur.level = approach(cur.level, T.level, dt, 0.9);
      cur.sunY = approach(cur.sunY, 70 - (T.sun - 2) * 9, dt, 3);
      cur.dip = approach(cur.dip, cur.flow * Math.min(24, 4 + cur.gpm * 2.2), dt, 1.5);

      // well geometry
      const bottom = cur.depthY, pumpTop = bottom - 20;
      el.casing.setAttribute("height", (bottom + 4 - 100).toFixed(1));
      el.casingClip.setAttribute("height", (bottom + 2 - 100).toFixed(1));
      el.casingWater.setAttribute("y", (AQUIFER + cur.dip).toFixed(1));
      const hum = cur.flow > 0.1 && !windmill ? Math.sin(t * 70) * 0.35 * cur.flow : 0;
      el.pumpG.setAttribute("transform", `translate(${hum.toFixed(2)} ${(pumpTop - 200).toFixed(1)})`);
      el.depthTag.setAttribute("y", (bottom + 4).toFixed(1));
      const tag = `${T.depth} FT`;
      if (el.depthTag.textContent !== tag) el.depthTag.textContent = tag;
      const pts = [[WELL_X, pumpTop], [WELL_X, 92], [248, 92], [248, 66], [280, 66], SPOUT];
      el.pipe.setAttribute("d", "M" + pts.map((p) => p.join(" ")).join("L"));
      const d = cur.dip, l = WELL_X - 70, r = WELL_X + 70, w = AQUIFER;
      el.drawdown.setAttribute("d", `M${l} ${w}C${WELL_X - 24} ${w} ${WELL_X - 14} ${w + d} ${WELL_X} ${w + d}C${WELL_X + 14} ${w + d} ${WELL_X + 24} ${w} ${r} ${w}Z`);

      // water drops ride the pipe from the pump to the spout
      const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
      const total = segs.reduce((a, b) => a + b, 0);
      cur.phase = (cur.phase + ((14 + cur.gpm * 8) * (0.35 + 0.65 * stroke) * dt) / total) % 1;
      drops.forEach((node, i) => {
        let s = ((cur.phase + i / DROPS) % 1) * total, k = 0;
        while (k < segs.length - 1 && s > segs[k]) { s -= segs[k]; k++; }
        const [a, b] = [pts[k], pts[k + 1]], f = segs[k] ? s / segs[k] : 0;
        node.setAttribute("cx", (a[0] + (b[0] - a[0]) * f).toFixed(1));
        node.setAttribute("cy", (a[1] + (b[1] - a[1]) * f).toFixed(1));
        node.setAttribute("opacity", cur.flow.toFixed(2));
      });

      specks.forEach((sp) => {
        const p = (t * (0.35 + cur.gpm * 0.05) + sp.off) % 1, dist = 34 * (1 - p);
        sp.node.setAttribute("cx", (WELL_X + Math.cos(sp.a) * dist * 1.4).toFixed(1));
        sp.node.setAttribute("cy", (bottom - 10 + Math.sin(sp.a) * dist * 0.6).toFixed(1));
        sp.node.setAttribute("opacity", (Math.sin(p * Math.PI) * 0.7 * cur.flow * (bottom - 10 > AQUIFER ? 1 : 0)).toFixed(2));
      });

      // stock tank: wavy surface, falling stream and splash rings
      const surf = TANK.bottom - TANK.depth * cur.level, amp = 0.35 + cur.flow * 0.9 * (0.5 + 0.5 * stroke);
      let path = `M${TANK.left} ${TANK.bottom}`;
      for (let x = TANK.left; x <= TANK.right; x += 3) path += `L${x} ${(surf + Math.sin(x * 0.22 + t * 3) * amp + Math.sin(x * 0.09 - t * 1.7) * amp * 0.6).toFixed(2)}`;
      el.tankWater.setAttribute("d", path + `L${TANK.right} ${TANK.bottom}Z`);
      el.stream.setAttribute("y2", surf.toFixed(1));
      el.stream.setAttribute("stroke-width", (0.8 + Math.min(2.4, cur.gpm * 0.3) * stroke).toFixed(2));
      el.stream.setAttribute("stroke-dashoffset", ((-t * (40 + cur.gpm * 6)) % 80).toFixed(1));
      el.stream.setAttribute("opacity", (cur.flow * (0.4 + 0.6 * stroke)).toFixed(2));
      rings.forEach((ring) => {
        const p = (t * 1.3 + ring.off) % 1;
        ring.node.setAttribute("cy", surf.toFixed(1));
        ring.node.setAttribute("rx", (2 + p * 12).toFixed(1));
        ring.node.setAttribute("ry", (0.6 + p * 2.4).toFixed(1));
        ring.node.setAttribute("opacity", ((1 - p) * 0.8 * cur.flow).toFixed(2));
      });

      // power sources
      el.wheel.setAttribute("transform", `translate(200 30) rotate(${cur.angle.toFixed(1)})`);
      el.tail.setAttribute("transform", `rotate(${(Math.sin(t * 0.7) * cur.wind * 0.12).toFixed(2)} 200 30)`);
      el.rod.setAttribute("transform", `translate(0 ${(Math.sin(rad(cur.angle) / 3) * 3).toFixed(2)})`);
      el.sun.setAttribute("transform", `translate(345 ${cur.sunY.toFixed(1)})`);
      el.sunRays.setAttribute("transform", `rotate(${(t * 8) % 360})`);
      el.sheen.setAttribute("x", (100 + ((t * 0.3) % 1) * 120).toFixed(1));
      el.wirePulse.setAttribute("stroke-dashoffset", (-t * 40 * cur.flow).toFixed(1));
      el.led.setAttribute("opacity", cur.flow > 0.5 && Math.sin(t * 7) > 0 ? 1 : 0.35);

      // sim weather: storms and cloudy days darken the sky, a heat wave warms it
      const W = T.weather;
      cur.dark = approach(cur.dark, W === "storm" ? 1 : W === "cloudy" ? 0.6 : 0, dt, 2);
      cur.heat = approach(cur.heat, W === "heat" ? 1 : 0, dt, 2);
      cur.rain = approach(cur.rain, W === "storm" ? 1 : 0, dt, 2);
      const flash = cur.rain > 0.8 && (t % 3.7) < 0.14 ? 1 : 0; // now and then a lightning bolt
      el.skyShade.setAttribute("opacity", (cur.dark * 0.5 - flash * 0.25).toFixed(2));
      el.skyHeat.setAttribute("opacity", (cur.heat * (0.22 + Math.sin(t * 2) * 0.04)).toFixed(2));
      el.bolt.setAttribute("opacity", flash);
      el.rain.setAttribute("opacity", cur.rain.toFixed(2));
      if (cur.rain > 0.01) rain.forEach((r) => {
        const y = ((t * 1.6 + r.off) % 1) * 112 - 8;
        r.node.setAttribute("transform", `translate(${r.x} ${y.toFixed(1)}) rotate(14)`);
      });
      el.sun.setAttribute("opacity", (1 - cur.dark * 0.8).toFixed(2));

      // weather and ground life
      clouds.forEach((c) => {
        c.x += (3 + cur.wind * 0.9) * c.s * dt;
        if (c.x > 420) c.x = -50;
        c.node.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.y}) scale(${c.s})`);
      });
      ripples.forEach((rp) => {
        rp.node.setAttribute("x", (rp.x + Math.sin(t * 0.4 + rp.ph) * 12).toFixed(1));
        rp.node.setAttribute("opacity", (0.25 + 0.2 * Math.sin(t * 0.9 + rp.ph)).toFixed(2));
      });
      grass.forEach((gr) => {
        const lean = Math.sin(t * (1.2 + cur.wind * 0.06) + gr.ph) * (2 + cur.wind * 0.5) + cur.wind * 0.4;
        gr.node.setAttribute("transform", `translate(${gr.x} ${GROUND}) rotate(${lean.toFixed(1)})`);
      });

      // animals walk in, swish their tails, and dip their heads to drink, graze or peck
      if (T.animal !== kind) restock(T.animal);
      let shake = 0;
      herd.forEach((c, i) => {
        const first = T.herd - T.down, on = i < T.herd; // the last few in line are the ones lost
        shake = Math.max(shake, c.draw({ t, dt, still, on, dying: on && i >= first, delay: (i - first) * 0.7, death: T.death, level: cur.level }));
      });
      buzzards.draw(t, dt, T.down > 0 && T.death !== "blown");
      svgEl.style.transform = shake > 0.05 ? `translate(${(Math.sin(t * 90) * shake).toFixed(1)}px, ${(Math.cos(t * 77) * shake * 0.6).toFixed(1)}px)` : "";
    }

    const anim = loop(svgEl, frame);
    return { set(next) { target = { ...target, ...next }; anim.invalidate(); } };
  }

  root.LabScene = { create };
})(window);
