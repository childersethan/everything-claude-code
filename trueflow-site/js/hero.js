/* Home page well diagram: a pump that cycles like a real pressure system.
   Pump on: pressure climbs 40 to 60 psi, water rises up the drop pipe and fills the pressure tank.
   Pump off: the tank pushes water to the house and pressure eases back to 40, then the pump kicks on again. */
(function () {
  "use strict";
  const rig = document.querySelector(".rig");
  if (!rig) return;
  const { svg, approach, loop } = window.Motion;
  const $ = (id) => document.getElementById(id);
  const el = { needle: $("needle"), col: $("waterCol"), tank: $("hTankWater"), pump: $("hPump"), drops: $("hDrops"),
    ripples: $("hRipples"), clouds: $("hClouds"), grass: $("hGrass"), intake: $("hIntake"), cone: $("hCone"), psi: $("gPsi"), gpm: $("gGpm"), depth: $("gDepth") };

  const CUT_IN = 40, CUT_OUT = 60, PUMP_SET = 340;
  const RISE_PSI_S = 4.2, FALL_PSI_S = 2.6; // pressure change per second while filling and while the house draws
  const AQUIFER = 220, WELL_X = 200;
  const RISER = [[WELL_X, 284], [WELL_X, 56]];
  const INTO_TANK = [[WELL_X, 56], [162, 56]];
  const OUT_OF_TANK = [[162, 56], [WELL_X, 56]];
  const TO_HOUSE = [[WELL_X, 56], [250, 56]];

  const makeDrops = (n) => Array.from({ length: n }, () => svg("circle", { r: 1.7 }, el.drops));
  const lanes = [
    { path: RISER, drops: makeDrops(10), speed: 70, phase: 0, show: 0 },
    { path: INTO_TANK, drops: makeDrops(3), speed: 34, phase: 0, show: 0 },
    { path: OUT_OF_TANK, drops: makeDrops(3), speed: 30, phase: 0.5, show: 0 },
    { path: TO_HOUSE, drops: makeDrops(4), speed: 40, phase: 0, show: 1 }
  ];
  const ripples = [[40, 240, 60], [290, 270, 70], [60, 300, 50], [270, 312, 40]].map(([x, y, w], i) =>
    ({ x, ph: i * 1.9, node: svg("rect", { x, y, width: w, height: 2, rx: 1 }, el.ripples) }));
  const clouds = [{ x: 110, y: 8, s: 0.8 }, { x: 330, y: 20, s: 0.6 }].map((c) =>
    ({ ...c, node: svg("path", { d: "M0 10a7 7 0 0 1 7-7 9 9 0 0 1 16-3 7 7 0 0 1 11 4 6 6 0 0 1 2 12H3a5 5 0 0 1-3-6z" }, el.clouds) }));
  const grass = [12, 40, 108, 126, 232, 330, 356, 384].map((x, i) =>
    ({ x, ph: i * 1.3, node: svg("path", { d: "M0 0q-1-5-4-7M0 0q0-6 1-9M0 0q1-4 4-6" }, el.grass) }));
  const specks = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * Math.PI * 2, off: (i * 0.41) % 1, node: svg("circle", { r: 1.2 }, el.intake) }));

  function pointAt(pts, f) {
    const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    let s = f * segs.reduce((a, b) => a + b, 0), k = 0;
    while (k < segs.length - 1 && s > segs[k]) { s -= segs[k]; k++; }
    const a = pts[k], b = pts[k + 1], t = segs[k] ? s / segs[k] : 0;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  const setText = (node, text) => { if (node.firstChild.nodeValue !== text) node.firstChild.nodeValue = text; };

  let psi = 52, on = true, shown = { psi: 0, gpm: 0, depth: 0 }, run = 0, sinceText = 1;

  function frame(dt, t, still) { // still: reduced motion, hold a calm mid-cycle picture
    if (!still) {
      psi += (on ? RISE_PSI_S : -FALL_PSI_S) * dt;
      if (psi >= CUT_OUT) on = false;
      if (psi <= CUT_IN) on = true;
    }
    run = approach(run, on ? 1 : 0, dt, 5); // the motor spins up and coasts down instead of snapping
    const gpm = run * (9.4 + Math.sin(t * 3) * 0.3);

    // gauges: the dial follows continuously, the numbers tick a few times a second
    shown = { psi: approach(shown.psi, psi, dt, 3), gpm: approach(shown.gpm, gpm, dt, 3), depth: approach(shown.depth, PUMP_SET, dt, 2.5) };
    el.needle.style.transform = `rotate(${(-120 + (shown.psi / 80) * 240).toFixed(1)}deg)`;
    sinceText += dt;
    if (sinceText > 0.25 || still) {
      sinceText = 0;
      setText(el.psi, String(Math.round(shown.psi)));
      setText(el.gpm, shown.gpm.toFixed(1));
      setText(el.depth, String(Math.round(shown.depth)));
    }

    // pressure tank fills as pressure builds; water level in the casing draws down while pumping
    const fill = (psi - 30) / 36;
    el.tank.setAttribute("y", (32 - 32 * fill).toFixed(1));
    el.tank.setAttribute("height", (32 * fill).toFixed(1));
    el.col.setAttribute("y", (170 + run * 9 + Math.sin(t * 1.3) * 0.6).toFixed(1));
    const dip = run * 12;
    el.cone.setAttribute("d", `M${WELL_X - 70} ${AQUIFER}C${WELL_X - 26} ${AQUIFER} ${WELL_X - 16} ${AQUIFER + dip} ${WELL_X} ${AQUIFER + dip}C${WELL_X + 16} ${AQUIFER + dip} ${WELL_X + 26} ${AQUIFER} ${WELL_X + 70} ${AQUIFER}Z`);
    el.pump.setAttribute("transform", `translate(${(Math.sin(t * 80) * 0.35 * run).toFixed(2)} 0)`);

    // water drops: up the riser and into the tank while the pump runs; tank to house all the time
    lanes[0].show = lanes[1].show = approach(lanes[0].show, run, dt, 6);
    lanes[2].show = 1 - lanes[0].show;
    lanes.forEach((lane) => {
      lane.phase = (lane.phase + (lane.speed * dt) / 120) % 1;
      lane.drops.forEach((node, i) => {
        const f = (lane.phase + i / lane.drops.length) % 1;
        const [x, y] = pointAt(lane.path, f);
        node.setAttribute("cx", x.toFixed(1));
        node.setAttribute("cy", y.toFixed(1));
        node.setAttribute("opacity", (lane.show * Math.min(1, f * 8, (1 - f) * 8)).toFixed(2));
      });
    });

    // sky and ground: clouds drift, grass sways
    clouds.forEach((c) => {
      c.x = c.x > 420 ? -50 : c.x + 6 * c.s * dt;
      c.node.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.y}) scale(${c.s})`);
    });
    grass.forEach((g) => g.node.setAttribute("transform", `translate(${g.x} 70) rotate(${(Math.sin(t * 1.4 + g.ph) * 5 + 3).toFixed(1)})`));

    // groundwater: slow shimmer, and specks drawn toward the intake while pumping
    ripples.forEach((r) => {
      r.node.setAttribute("x", (r.x + Math.sin(t * 0.5 + r.ph) * 10).toFixed(1));
      r.node.setAttribute("opacity", (0.3 + 0.2 * Math.sin(t * 0.9 + r.ph)).toFixed(2));
    });
    specks.forEach((s) => {
      const p = (t * 0.5 + s.off) % 1, d = 40 * (1 - p);
      s.node.setAttribute("cx", (WELL_X + Math.cos(s.a) * d * 1.3).toFixed(1));
      s.node.setAttribute("cy", (300 + Math.sin(s.a) * d * 0.5).toFixed(1));
      s.node.setAttribute("opacity", (Math.sin(p * Math.PI) * 0.75 * run).toFixed(2));
    });
  }

  loop(rig, frame);
})();
