/* Water Lab, House well diagram: a cutaway farmhouse, its family, the pressure tank and gauge, and the well.
   lab-house.js decides the numbers; this file only draws them. Every moving value eases toward its target.
   Two modes: "live" (the controls) plays the rush hour on a loop in fast-forward so the pump visibly cycles,
   and "run" (the busy-day sim) shows the hour lab-house.js hands it. */
(function (root) {
  "use strict";
  const { svg, approach, loop } = root.Motion;

  const lerp = (a, b, p) => a + (b - a) * p;
  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  const smooth = (a, b, x) => { const p = clamp01((x - a) / (b - a)); return p * p * (3 - 2 * p); };
  const rad = (deg) => (deg * Math.PI) / 180;

  // ----- sky through the day: [hour, top color, horizon color] -----
  const SKY = [[0, "#0b1a33", "#1b2d4f"], [4.8, "#13254a", "#2c3a62"], [5.8, "#3d5a96", "#e79a62"], [7, "#76aedb", "#f6d3a2"],
    [9, "#6fb2df", "#cfe8f3"], [17.5, "#6fb2df", "#d6ecf5"], [19.6, "#5470ad", "#f19a5a"], [20.8, "#22305e", "#8a5a78"], [22, "#0b1a33", "#1b2d4f"], [24, "#0b1a33", "#1b2d4f"]];
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mixHex = (a, b, p) => "#" + hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], p)).toString(16).padStart(2, "0")).join("");
  function skyAt(h) {
    const x = ((h % 24) + 24) % 24;
    const i = SKY.findIndex((s, k) => k < SKY.length - 1 && x >= s[0] && x < SKY[k + 1][0]);
    const [a, b] = [SKY[i], SKY[i + 1]], p = (x - a[0]) / (b[0] - a[0]);
    return { top: mixHex(a[1], b[1], p), low: mixHex(a[2], b[2], p) };
  }
  /** 0 in daylight, 1 at night. */
  const darkness = (h) => { const x = ((h % 24) + 24) % 24; return 1 - smooth(5.2, 7, x) + smooth(19.8, 21.4, x); };
  const SUNRISE = 6.2, SUNSET = 20.6;

  // ----- the family: eight looks, drawn in this order as people are added -----
  const LOOKS = [
    { skin: "#f2c9a0", hair: "#5b3a1e", style: "short", shirt: "#c8343a", pants: "#2f4b6e", towel: "#f2b631" },
    { skin: "#d9a47a", hair: "#2b1a10", style: "pony", shirt: "#1f8a8a", pants: "#3b3b52", towel: "#e98fb0" },
    { skin: "#8d5a3b", hair: "#1a1a1a", style: "puffs", shirt: "#f2b631", pants: "#3a6ea5", towel: "#7cc4ee", kid: true },
    { skin: "#f2c9a0", hair: "#c9772e", style: "short", shirt: "#4c9a4c", pants: "#5a4632", towel: "#fff", kid: true },
    { skin: "#f0d0b0", hair: "#d8d8d8", style: "cap", cap: "#3f7a3a", shirt: "#e8e1d0", pants: "#3a6ea5", straps: true, towel: "#c8343a" },
    { skin: "#c98b5b", hair: "#a3a3a3", style: "bun", shirt: "#8e5aa8", pants: "#4a3a5a", towel: "#9fd0ef" },
    { skin: "#e8b48a", hair: "#3b2414", style: "long", shirt: "#ef7d3c", pants: "#2f3b4a", towel: "#4c9a4c" },
    { skin: "#f6d2b8", hair: "#e8c35a", style: "tuft", shirt: "#e98fb0", pants: "#e98fb0", towel: "#f2b631", kid: true, tiny: true }
  ];
  const scaleOf = (look) => (look.tiny ? 0.74 : look.kid ? 0.9 : 1.12);

  /** Hair (and cap) for a head centered on (0, cy) with radius 5.4. */
  function hair(parent, look, cy, wet) {
    const top = `M-5.7 ${cy - 0.5}c0-4 2.5-6.3 5.7-6.3s5.7 2.3 5.7 6.3c-1.3-1.7-3.1-2.6-5.1-2.8-1.7 1.3-3.9 2-6.3 2.8z`;
    const at = (d) => svg("path", { d, fill: wet ? mixHex(look.hair, "#000000", 0.25) : look.hair, class: "ol" }, parent);
    if (look.style === "cap" && !wet) {
      at(`M-5.6 ${cy}c-.6 2-.4 3.5.4 4.6M5.6 ${cy}c.6 2 .4 3.5-.4 4.6`);
      svg("path", { d: `M-5.8 ${cy - 0.8}c0-4 2.6-6 5.8-6s5.8 2 5.8 6z`, fill: look.cap, class: "ol" }, parent);
      svg("path", { d: `M1 ${cy - 1.2}h7c.9 0 .9 1.4 0 1.4H1z`, fill: look.cap, class: "ol" }, parent);
      return;
    }
    if (look.style === "long" && !wet) at(`M-5.8 ${cy - 1}c-1.2 4-1 7.5.4 10h2.2l-.8-9zM5.8 ${cy - 1}c1.2 4 1 7.5-.4 10h-2.2l.8-9z`);
    if (look.style === "pony" && !wet) at(`M4.6 ${cy - 2}c3.4 0 4.8 3.4 3.6 7.4-1-1.6-2.6-3.1-4-3.6z`);
    if (look.style === "puffs" && !wet) { at(`M-7.6 ${cy - 4}a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0-5.4 0z`); at(`M2.2 ${cy - 4}a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0-5.4 0z`); }
    if (look.style === "bun" && !wet) at(`M-2.4 ${cy - 6.4}a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0z`);
    at(top);
    if (look.style === "tuft" && !wet) svg("path", { d: `M0 ${cy - 6.4}c-1-2.2 1.2-3.6 2.2-2`, fill: "none", stroke: look.hair, "stroke-width": 1.2, "stroke-linecap": "round" }, parent);
  }

  /** A face on a head centered on (0, cy): eyes, cheeks, and every mouth, with all but one hidden. */
  function face(parent, cy) {
    const eyes = svg("g", {}, parent);
    svg("circle", { cx: -1.9, cy: cy - 0.2, r: 0.75, class: "eye" }, eyes);
    svg("circle", { cx: 1.9, cy: cy - 0.2, r: 0.75, class: "eye" }, eyes);
    const shut = svg("path", { d: `M-2.8 ${cy - 0.2}q.9 .9 1.8 0M1 ${cy - 0.2}q.9 .9 1.8 0`, class: "mouth", opacity: 0 }, parent);
    const wide = svg("g", { opacity: 0 }, parent);
    [-2, 2].forEach((x) => { svg("circle", { cx: x, cy: cy - 0.4, r: 1.3, fill: "#fff", class: "ol" }, wide); svg("circle", { cx: x, cy: cy - 0.4, r: 0.55, class: "eye" }, wide); });
    svg("circle", { cx: -3.1, cy: cy + 1.6, r: 1, class: "cheek" }, parent);
    svg("circle", { cx: 3.1, cy: cy + 1.6, r: 1, class: "cheek" }, parent);
    const mouths = {
      smile: svg("path", { d: `M-1.6 ${cy + 2.2}q1.6 1.4 3.2 0`, class: "mouth" }, parent),
      sing: svg("ellipse", { cx: 0, cy: cy + 2.8, rx: 1.1, ry: 1.4, class: "mouth-o", opacity: 0 }, parent),
      shock: svg("ellipse", { cx: 0, cy: cy + 3, rx: 1.4, ry: 1.9, class: "mouth-o", opacity: 0 }, parent),
      brr: svg("path", { d: `M-2 ${cy + 2.8}l.8-.7.8.7.8-.7.8.7.8-.7`, class: "mouth", opacity: 0 }, parent)
    };
    let shown = "";
    /** expression: "smile", "sing", "shock" or "brr". */
    return (expr) => {
      if (expr === shown) return;
      shown = expr;
      Object.entries(mouths).forEach(([k, m]) => m.setAttribute("opacity", k === expr ? 1 : 0));
      eyes.setAttribute("opacity", expr === "smile" || expr === "brr" ? 1 : 0);
      shut.setAttribute("opacity", expr === "sing" ? 1 : 0);
      wide.setAttribute("opacity", expr === "shock" ? 1 : 0);
    };
  }

  /** One family member standing with feet on (0, 0). Returns the parts that move. */
  function person(parent, look) {
    const g = svg("g", { class: "hw-person", opacity: 0 }, parent);
    const body = svg("g", {}, g);
    [-2.4, 2.4].forEach((x) => svg("ellipse", { cx: x, cy: -0.9, rx: 2.3, ry: 1.1, fill: "#3a2a20" }, body));
    svg("path", { d: "M-4-11.6h8l-.3 10.4h-3.1l-.6-6.3-.6 6.3h-3.1z", fill: look.pants, class: "ol" }, body);
    const arm = (side) => {
      const a = svg("g", {}, body);
      svg("path", { d: "M-1.4 0h2.8v7.6a1.4 1.4 0 0 1-2.8 0z", fill: look.shirt, class: "ol" }, a);
      svg("circle", { cx: 0, cy: 8.7, r: 1.5, fill: look.skin, class: "ol skin" }, a);
      return { a, side };
    };
    const arms = [arm(-1), arm(1)];
    svg("path", { d: "M-4.9-11.4l.3-9.2c.1-1.7 1.4-3 3.1-3h3c1.7 0 3 1.3 3.1 3l.3 9.2z", fill: look.shirt, class: "ol" }, body);
    if (look.straps) svg("path", { d: "M-3.4-23.4v10h6.8v-10M-3.4-17h6.8", fill: "none", stroke: look.pants, "stroke-width": 1.4 }, body);
    svg("rect", { x: -1.2, y: -25.2, width: 2.4, height: 2.4, fill: look.skin }, body);
    const head = svg("g", {}, body);
    [-5.2, 5.2].forEach((x) => svg("circle", { cx: x, cy: -28.6, r: 1.2, fill: look.skin, class: "ol skin" }, head));
    svg("circle", { cx: 0, cy: -29, r: 5.4, fill: look.skin, class: "ol skin" }, head);
    hair(head, look, -29, false);
    const expr = face(head, -29);
    const towel = svg("g", { opacity: 0 }, body);
    svg("path", { d: "M-4.6-23.6c2.2 2.2 7 2.2 9.2 0l.5 2c-2.6 2.2-7.6 2.2-10.2 0z", fill: look.towel, class: "towel" }, towel);
    svg("path", { d: "M2.4-22.4l2.6 9h-3l-1.4-8.6z", fill: look.towel, class: "towel" }, towel);
    return { g, body, arms, head, towel, expr, look, s: scaleOf(look) };
  }

  /** Someone in the shower, standing on (0, 0): bare shoulders above the frosted glass, wet hair, suds. */
  function showerer(parent, look) {
    const g = svg("g", { class: "hw-person", opacity: 0 }, parent);
    const body = svg("g", {}, g);
    svg("path", { d: "M-5-6l.3-14.6c.1-1.7 1.4-3 3.1-3h3.2c1.7 0 3 1.3 3.1 3L5-6z", fill: look.skin, class: "ol skin" }, body);
    const arm = svg("g", { transform: "translate(4.4 -22.4)" }, body);
    svg("path", { d: "M-1.4 0h2.8v7.6a1.4 1.4 0 0 1-2.8 0z", fill: look.skin, class: "ol skin" }, arm);
    svg("circle", { cx: 0, cy: 8.7, r: 1.6, fill: "#f6f0e8", class: "ol" }, arm); // a sponge
    const head = svg("g", {}, body);
    svg("circle", { cx: 0, cy: -29, r: 5.4, fill: look.skin, class: "ol skin" }, head);
    hair(head, look, -29, true);
    const expr = face(head, -29);
    const suds = svg("g", { class: "hw-suds" }, head);
    // a little shampoo always; a whole head of foam when the water quits on them
    const light = [[-3, -34, 1.6], [0, -35.2, 2], [3.2, -34, 1.7], [-5, -31.5, 1.3], [5.2, -31.5, 1.4]];
    const heavy = [[-6, -36, 2.6], [-2, -39.5, 3], [3, -39, 2.8], [7, -35.4, 2.4], [-7.6, -30.5, 2], [7.8, -29.5, 2], [-6.4, -22.5, 2],
      [6.2, -22, 2.2], [0, -20.5, 1.9], [-3.2, -17.4, 1.6], [3.6, -16.4, 1.7], [-1.4, -43, 1.6], [4.6, -42, 1.3]];
    const bubbles = [...light.map((b) => [...b, false]), ...heavy.map((b) => [...b, true])]
      .map(([x, y, r, big]) => ({ node: svg("circle", { cx: x, cy: y, r }, suds), heavy: big }));
    return { g, body, arm, head, expr, suds: bubbles, look, s: scaleOf(look) };
  }

  /** A sleeper's head on a pillow with the quilt pulled up; (0, 0) is the middle of the pillow. */
  function sleeper(parent, look) {
    const g = svg("g", { opacity: 0 }, parent);
    svg("ellipse", { cx: 0, cy: 0, rx: 6.5, ry: 2.6, class: "hw-pillow" }, g);
    const s = scaleOf(look) * 0.85;
    const head = svg("g", { transform: `translate(0 ${-1 - 3 * s}) scale(${s})` }, g);
    svg("circle", { cx: 0, cy: 0, r: 5.4, fill: look.skin, class: "ol skin" }, head);
    hair(head, { ...look, style: look.style === "cap" ? "short" : look.style }, 0, false);
    svg("path", { d: "M-2.8 .3q.9 .9 1.8 0M1 .3q.9 .9 1.8 0", class: "mouth" }, head);
    return g;
  }

  // where people stand: feet positions in the rooms
  const BEDROOM = [248, 264, 280, 296, 320, 336, 352, 370].map((x) => ({ x, y: 143 }));
  const SPOT = { sink: { x: 208, y: 197 }, laundry: { x: 364, y: 197 }, yard: { x: 50, y: 200 } };
  const STALLS = [{ x: 173, y: 143, nozzle: [172, 108.6], floor: 143, steam: 116 }, { x: 284, y: 197, nozzle: [283, 160.6], floor: 197, steam: 168 }];
  const PILLOWS = [244, 259, 274, 289, 322, 337, 352, 367];
  const GAUGE = { x: 214, y: 216, r: 10 };
  const psiAngle = (psi) => -135 + (Math.max(0, Math.min(80, psi)) / 80) * 270;
  const arcAt = (a0, a1, r) => {
    const p = (a) => `${(GAUGE.x + r * Math.sin(rad(a))).toFixed(2)} ${(GAUGE.y - r * Math.cos(rad(a))).toFixed(2)}`;
    return `M${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}`;
  };

  /** Spreads `n` dots along a polyline at phase `ph` (0 to 1), fading them in with `op`. */
  function ride(dots, pts, ph, op) {
    const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const total = segs.reduce((a, b) => a + b, 0);
    dots.forEach((node, i) => {
      let s = ((ph + i / dots.length) % 1) * total, k = 0;
      while (k < segs.length - 1 && s > segs[k]) { s -= segs[k]; k++; }
      const [a, b] = [pts[k], pts[k + 1]], f = segs[k] ? s / segs[k] : 0;
      node.setAttribute("cx", (a[0] + (b[0] - a[0]) * f).toFixed(1));
      node.setAttribute("cy", (a[1] + (b[1] - a[1]) * f).toFixed(1));
      node.setAttribute("opacity", op.toFixed(2));
    });
  }

  function create(svgEl) {
    const $ = (id) => svgEl.querySelector("#" + id);
    const el = Object.fromEntries(["hwSkyTop", "hwSkyLow", "hwStars", "hwSun", "hwSunRays", "hwMoon", "hwClouds", "hwRainbow", "hwRipples", "hwInflow",
      "hwWet", "hwGrass", "hwGardenG", "hwCow", "hwTroughWater", "hwHoseSpray", "hwSprinklerG", "hwJets", "hwSprinkHead", "hwCasingWater", "hwBubbles",
      "hwPumpG", "hwPumpGlow", "hwSmoke", "hwFeedDots", "hwSleepers", "hwDishLed", "hwDrumWater", "hwDrum", "hwSprayA", "hwSprayB", "hwFaucet",
      "hwFolks", "hwFx", "hwShade", "hwLights", "hwSwitchLed", "hwTankWater", "hwFlame", "hwGaugeRed", "hwGaugeGreen", "hwTicks", "hwNeedle",
      "hwPsiTag", "hwCasingTag", "hwWellTag", "hwPumpTag"].map((id) => [id, $(id)]));
    const windows = [...svgEl.querySelectorAll(".hw-win")];

    // ----- build the moving parts once -----
    for (let i = 0; i < 8; i++) svg("line", { x1: 0, y1: -13, x2: 0, y2: -17, transform: `rotate(${i * 45})` }, el.hwSunRays);
    const stars = Array.from({ length: 28 }, (_, i) => ({ ph: i * 2.1, node: svg("circle", { cx: (i * 97 + 13) % 400, cy: 6 + ((i * 53) % 150), r: i % 4 ? 0.7 : 1.1 }, el.hwStars) }));
    const clouds = [{ x: 30, y: 26, s: 0.9 }, { x: 230, y: 14, s: 0.7 }, { x: 330, y: 40, s: 0.55 }].map((c) =>
      ({ ...c, node: svg("path", { d: "M0 10a7 7 0 0 1 7-7 9 9 0 0 1 16-3 7 7 0 0 1 11 4 6 6 0 0 1 2 12H3a5 5 0 0 1-3-6z" }, el.hwClouds) }));
    ["#e2442f", "#f2b631", "#3fae5a", "#3f8fd2", "#8e5aa8"].forEach((c, i) => svg("path", { d: `M${24 + i * 3} 199a${42 - i * 3} ${42 - i * 3} 0 0 1 ${84 - i * 6} 0`, stroke: c, "stroke-opacity": 0.8 }, el.hwRainbow));
    const ripples = [[20, 296], [300, 300], [170, 318], [250, 336], [40, 330], [340, 350]].map(([x, y], i) => ({ x, ph: i * 1.7, node: svg("rect", { x, y, width: 40, height: 1.4, rx: 0.7 }, el.hwRipples) }));
    const inflow = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, off: (i * 0.37) % 1, node: svg("circle", { r: 1, class: "hw-inflow" }, el.hwInflow) }));
    const grass = [6, 50, 58, 76, 112, 146, 140].map((x, i) => ({ x, ph: i, node: svg("path", { d: "M0 0q-1-5-4-7M0 0q0-6 1-9M0 0q1-4 4-6", transform: `translate(${x} 200)` }, el.hwGrass) }));
    const jets = [-38, -27, -15, 15, 27, 38].map((dx) => ({ dx, node: svg("path", {}, el.hwJets) }));
    el.hwJets.setAttribute("class", "hw-jets");
    const cow = root.LabAnimals ? root.LabAnimals.create(el.hwCow, { x: 94, face: 1, s: 0.78, drink: true, y: 198 }, "cattle") : null;
    const casingBubbles = Array.from({ length: 6 }, (_, i) => ({ off: i / 6, node: svg("circle", { r: 0.8, cx: 125 + (i * 7) % 7, fill: "#fff" }, el.hwBubbles) }));
    const smoke = Array.from({ length: 14 }, (_, i) => ({ off: i / 14, node: svg("circle", { r: 3 }, el.hwSmoke) }));
    const sparks = Array.from({ length: 6 }, (_, i) => ({ a: i * 1.05, node: svg("path", { d: "M0-2.4l.7 1.7 1.7.7-1.7.7L0 2.4-.7.7-2.4 0-.7-.7z", class: "hw-spark" }, el.hwSmoke) }));
    const alarm = svg("circle", { cx: GAUGE.x, cy: GAUGE.y, r: GAUGE.r + 2, class: "hw-alarm", opacity: 0 }, el.hwTicks);
    const feedDots = Array.from({ length: 12 }, () => svg("circle", { r: 1.3, class: "hw-dot" }, el.hwFeedDots));
    const houseDots = Array.from({ length: 6 }, () => svg("circle", { r: 1.3, class: "hw-dot" }, el.hwFeedDots));
    const drum = [0, 1, 2].map((i) => ({ a: (i * Math.PI * 2) / 3, node: svg("circle", { r: 1.8, fill: ["#c8343a", "#f2b631", "#3f8fd2"][i] }, el.hwDrum) }));

    // gauge face: red below 20 psi, green from 40 to 60, ticks every 20
    el.hwGaugeRed.setAttribute("d", arcAt(psiAngle(0), psiAngle(20), 7.6));
    el.hwGaugeGreen.setAttribute("d", arcAt(psiAngle(40), psiAngle(60), 7.6));
    [0, 20, 40, 60, 80].forEach((p) => {
      const a = rad(psiAngle(p)), s = Math.sin(a), c = Math.cos(a);
      svg("line", { x1: GAUGE.x + s * 8.6, y1: GAUGE.y - c * 8.6, x2: GAUGE.x + s * 9.6, y2: GAUGE.y - c * 9.6, class: "hw-tick" }, el.hwTicks);
    });

    // room shading for night, with a warm lamp glow when someone's up
    const ROOMS = [[156, 97, 66, 46], [226, 97, 160, 46], [156, 149, 110, 48], [270, 149, 48, 48], [322, 149, 64, 48], [152, 44, 238, 50]];
    const shades = ROOMS.map(([x, y, w, h], i) => ({
      dark: svg(i === 5 ? "path" : "rect", i === 5 ? { d: "M152 94 271 43 390 94Z", fill: "#081226", opacity: 0 } : { x, y, width: w, height: h, fill: "#081226", opacity: 0 }, el.hwShade),
      warm: i === 5 ? null : svg("rect", { x, y, width: w, height: h, fill: "#ffc65c", opacity: 0 }, el.hwShade)
    }));

    // celebration string lights along the eaves
    const wire = svg("path", { d: "M140 97Q205 72 271 40Q337 72 402 97", class: "hw-wire", opacity: 0 }, el.hwLights);
    const BULB_COLORS = ["#ff5a5a", "#ffd34d", "#4fd17a", "#5ab8ff", "#ff8ad8"];
    const bulbs = Array.from({ length: 17 }, (_, i) => {
      const p = i / 16, x = lerp(140, 402, p), y = p < 0.5 ? lerp(97, 40, p * 2) + Math.sin(p * 2 * Math.PI) * 6 : lerp(40, 97, (p - 0.5) * 2) + Math.sin((p - 0.5) * 2 * Math.PI) * 6;
      return svg("circle", { cx: x.toFixed(1), cy: (y + 2.5).toFixed(1), r: 1.7, fill: BULB_COLORS[i % 5], class: "hw-bulb", opacity: 0 }, el.hwLights);
    });

    // the family: standing figures, people in each shower, and sleepers in the two big beds
    const folks = LOOKS.map((look) => ({ ...person(el.hwFolks, look), cur: { op: 0, x: 0, y: 0, key: "" } }));
    const stallFolks = [el.hwSprayA, el.hwSprayB].map((spray) => {
      const layer = svg("g", {}); // in front of the spray, so the water pours down around them
      spray.parentNode.insertBefore(layer, spray.nextSibling);
      return LOOKS.map((look) => ({ ...showerer(layer, look), op: 0 }));
    });
    const quilts = [svg("rect", { x: 240, y: 129, width: 62, height: 9, rx: 3, fill: "#c8343a", class: "hw-quilt", opacity: 0 }), svg("rect", { x: 318, y: 129, width: 62, height: 9, rx: 3, fill: "#3f7fb3", class: "hw-quilt", opacity: 0 })];
    const sleepers = LOOKS.map((look, i) => {
      const g = sleeper(el.hwSleepers, look);
      g.setAttribute("transform", `translate(${PILLOWS[i]} 130)`);
      return { g, op: 0 };
    });
    quilts.forEach((q) => el.hwSleepers.appendChild(q));

    // shower spray, steam, and the air a dry shower coughs out
    const sprays = STALLS.map((st, k) => {
      const parent = k ? el.hwSprayB : el.hwSprayA;
      return {
        lines: Array.from({ length: 7 }, () => svg("line", {}, parent)),
        drips: Array.from({ length: 4 }, (_, i) => ({ off: i / 4, node: svg("circle", { r: 0.9, fill: "#7cc4ee" }, parent) })),
        puffs: Array.from({ length: 3 }, (_, i) => ({ off: i / 3, node: svg("circle", { class: "puff" }, parent) })),
        steam: [0, 1, 2].map((i) => ({ off: i / 3, node: svg("path", { d: "M0 0q1.5-2 0-4t0-4", class: "hw-steam" }, el.hwFx) })),
        cur: { f: 0, on: 0, air: 0 }
      };
    });

    // ending effects: music notes, "?!", "BRRR", Zzz
    const NOTE = "M0 0a1.8 1.4 0 1 0 1.6 1.2V-6l4 1.2v5a1.8 1.4 0 1 0 1.6 1.2v-8.6L1.6-9z";
    const notes = [0, 1, 2].map((i) => ({ off: i / 3, node: svg("path", { d: NOTE, class: "hw-note", opacity: 0 }, el.hwFx) }));
    const shock = svg("text", { class: "hw-shock", "text-anchor": "middle", opacity: 0 }, el.hwFx);
    shock.textContent = "?!";
    const pfft = svg("text", { class: "hw-pfft", "text-anchor": "end", opacity: 0 }, el.hwFx);
    pfft.textContent = "pfft!";
    const brr = svg("text", { class: "hw-brr", "text-anchor": "middle", opacity: 0 }, el.hwFx);
    brr.textContent = "BRRR";
    const zs = [0, 1, 2].map((i) => { const z = svg("text", { class: "hw-z", opacity: 0 }, el.hwFx); z.textContent = "z"; return { off: i / 3, node: z }; });

    let target = { mode: "live", people: 4, sprinklerOwned: false, gardenOwned: false, clock: 6.6, asleep: false, showers: 2, kitchen: true, dishes: false,
      washer: false, sprinkler: false, garden: false, waterer: false, need: 8, pump: 10, well: 8, drawdown: 12, psi: 50, cycling: false, tank: 0.5,
      casing: 1, casingGal: 105, pumpOn: 0, dry: false, trickle: false, ending: null };
    const cur = { clock: 6.6, psi: 50, tank: 0.5, casing: 1, pump: 0, house: 0, kitchen: 0, washer: 0, dish: 0, sprink: 0, garden: 0, owned: 0, gOwned: 0,
      dry: 0, party: 0, sleep: 0, feedPh: 0, housePh: 0, wobble: 0 };
    // live mode's fast-forward model of the tank and casing (gallons above the 40 psi mark, fraction of casing)
    const live = { tank: 6, casing: 1, pumping: false };

    /** Who is where this hour: stall occupants and every standing person's spot. */
    function cast(T) {
      const n = T.people, order = Array.from({ length: n }, (_, i) => (i + (T.clock >= 15 ? 1 : 0)) % n);
      const roles = new Array(LOOKS.length).fill(null), stalls = [-1, -1];
      if (T.asleep) return { roles, stalls };
      let k = 0;
      const take = () => (k < n ? order[k++] : -1);
      for (let s = 0; s < Math.min(2, T.showers); s++) stalls[s] = take();
      const give = (who, role) => { if (who >= 0) roles[who] = role; };
      if (T.kitchen || T.dishes) give(take(), { key: "sink", ...SPOT.sink, pose: "sink" });
      if (T.washer) give(take(), { key: "laundry", ...SPOT.laundry, pose: "laundry" });
      if (T.garden) give(take(), { key: "yard", ...SPOT.yard, pose: "hose" });
      let b = 0;
      while (k < n) { const who = take(); give(who, { key: "bed" + b, ...BEDROOM[b], pose: T.showers > 0 ? "wait" : "stand" }); b++; }
      return { roles, stalls };
    }

    function frame(dt, t, still) {
      const T = target, end = T.ending, party = end === "thrived" || end === "tight";
      const lost = end === "lost", cold = end === "thirsty" || (T.mode === "run" && T.trickle);

      // ----- pressure, tank and casing -----
      let psi, tankF, casingF, pumpOn;
      if (T.mode === "live") {
        const short = T.need > T.pump;
        if (still) {
          psi = short ? Math.max(5, 40 * T.pump / T.need) : 50; tankF = short ? 0 : 0.5; casingF = T.pump > T.well ? 0.75 : 1; pumpOn = 1;
        } else {
          // fast-forward: one second on screen is a minute and a half of the rush
          const m = dt * 1.5, D = Math.max(1, T.drawdown);
          if (!live.pumping && live.tank <= T.need * m + 0.001) live.pumping = true;
          const casingGal = live.casing * T.casingGal;
          const pumped = live.pumping ? Math.min(T.pump * m, casingGal + T.well * m) : 0;
          live.casing = Math.max(0.3, Math.min(1, (casingGal + T.well * m - pumped) / T.casingGal));
          const have = live.tank + pumped, need = T.need * m;
          if (have >= need) { live.tank = Math.min(D, have - need); if (live.tank >= D - 0.001) live.pumping = false; psi = 40 + 20 * live.tank / D; }
          else { live.tank = 0; psi = 40 * have / Math.max(need, 0.001); }
          tankF = live.tank / D; casingF = live.casing; pumpOn = live.pumping ? 1 : 0;
        }
      } else {
        psi = T.cycling && !still ? 50 + Math.sin(t * 2.2) * 8 : T.psi;
        tankF = T.cycling && !still ? 0.5 + Math.sin(t * 2.2) * 0.4 : T.tank;
        casingF = T.casing; pumpOn = T.pumpOn > 0.02 ? 1 : 0;
      }
      if (lost) psi = still ? 0 : Math.abs(Math.sin(t * 13)) * 1.5;
      cur.psi = approach(cur.psi, psi, dt, 5);
      cur.tank = approach(cur.tank, tankF, dt, 3);
      cur.casing = approach(cur.casing, casingF, dt, 2);
      cur.pump = approach(cur.pump, pumpOn, dt, 6);
      cur.clock = approach(cur.clock, T.clock + (cur.clock - T.clock > 12 ? 24 : 0), dt, 3) % 24; // wraps past midnight forward
      cur.dry = approach(cur.dry, T.dry || lost ? 1 : 0, dt, 3);
      cur.party = approach(cur.party, party ? 1 : 0, dt, 3);
      cur.sleep = approach(cur.sleep, T.asleep ? 1 : 0, dt, 3);
      ["kitchen", "washer", "sprinkler", "garden"].forEach((k) => { cur[k] = approach(cur[k] || 0, T[k] ? 1 : 0, dt, 4); });
      cur.dish = approach(cur.dish, T.dishes ? 1 : 0, dt, 4);
      cur.owned = approach(cur.owned, T.sprinklerOwned ? 1 : 0, dt, 5);
      cur.gOwned = approach(cur.gOwned, T.gardenOwned ? 1 : 0, dt, 5);
      const pf = clamp01(cur.psi / 50); // how hard water comes out of a tap
      const anyUse = T.showers > 0 || T.kitchen || T.dishes || T.washer || T.sprinkler || T.garden || T.waterer;
      cur.house = approach(cur.house, anyUse ? 1 : 0, dt, 4);

      // ----- sky -----
      const h = cur.clock, sky = skyAt(h), dark = darkness(h);
      el.hwSkyTop.setAttribute("stop-color", sky.top);
      el.hwSkyLow.setAttribute("stop-color", sky.low);
      const winFill = mixHex(sky.low, "#ffffff", 0.25);
      windows.forEach((w) => w.setAttribute("style", `fill:${winFill}`));
      stars.forEach((s) => s.node.setAttribute("opacity", (dark * (still ? 0.8 : 0.55 + 0.45 * Math.sin(t * 2 + s.ph))).toFixed(2)));
      const dayP = (h - SUNRISE) / (SUNSET - SUNRISE), nightP = (((h - SUNSET) % 24) + 24) % 24 / (24 - SUNSET + SUNRISE);
      const arc = (p) => [lerp(18, 382, p), 176 - Math.sin(Math.PI * clamp01(p)) * 150];
      const [sx, sy] = arc(dayP), [mx, my] = arc(nightP);
      el.hwSun.setAttribute("transform", `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
      el.hwSun.setAttribute("opacity", dayP > -0.05 && dayP < 1.05 ? 1 : 0);
      el.hwSunRays.setAttribute("transform", `rotate(${still ? 0 : (t * 10) % 360})`);
      el.hwMoon.setAttribute("transform", `translate(${mx.toFixed(1)} ${my.toFixed(1)})`);
      el.hwMoon.setAttribute("opacity", (dark * (nightP > 0 && nightP < 1 ? 1 : 0)).toFixed(2));
      clouds.forEach((c) => {
        if (!still) { c.x += 3 * c.s * dt; if (c.x > 420) c.x = -50; }
        c.node.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.y}) scale(${c.s})`);
        c.node.setAttribute("opacity", (1 - dark * 0.75).toFixed(2));
      });
      el.hwRainbow.setAttribute("opacity", (cur.party * (1 - dark * 0.7) * 0.9).toFixed(2));

      // ----- rooms at night: dark when asleep, lamp-lit when someone's up -----
      shades.forEach((s, i) => {
        const lit = !T.asleep && i !== 5;
        s.dark.setAttribute("opacity", (dark * (lit ? 0.18 : 0.5)).toFixed(2));
        if (s.warm) s.warm.setAttribute("opacity", (lit ? dark * 0.16 + cur.party * 0.06 * (still ? 1 : 0.6 + 0.4 * Math.sin(t * 6 + i)) : 0).toFixed(3));
      });
      el.hwLights.setAttribute("opacity", cur.party.toFixed(2));
      wire.setAttribute("opacity", 1);
      bulbs.forEach((b, i) => b.setAttribute("opacity", (still ? 1 : 0.35 + 0.65 * Math.abs(Math.sin(t * 3 + i * 1.3))).toFixed(2)));

      // ----- the well: water in the casing, inflow, pump hum, smoke when it runs dry -----
      const waterY = lerp(328, 270, cur.casing);
      el.hwCasingWater.setAttribute("y", waterY.toFixed(1));
      el.hwCasingTag.textContent = `CASING ${Math.round(cur.casing * T.casingGal)} GAL`;
      el.hwWellTag.textContent = `WELL GIVES ${T.well} GPM`;
      el.hwPumpTag.textContent = `PUMP ${T.pump} GPM`;
      const hum = !still && cur.pump > 0.5 ? Math.sin(t * 70) * 0.3 + (cur.dry > 0.5 ? Math.sin(t * 31) * 0.6 : 0) : 0;
      el.hwPumpG.setAttribute("transform", `translate(${hum.toFixed(2)} 0)`);
      el.hwPumpGlow.setAttribute("opacity", (cur.dry * (still ? 0.6 : 0.35 + 0.3 * Math.sin(t * 9))).toFixed(2));
      const flowIn = Math.min(1, T.well / 12);
      inflow.forEach((sp, i) => {
        const p = still ? 0.5 : (t * (0.25 + flowIn * 0.5) + sp.off) % 1, dist = 40 * (1 - p);
        sp.node.setAttribute("cx", (128 + Math.cos(sp.a) * dist * 1.5).toFixed(1));
        sp.node.setAttribute("cy", (322 + Math.sin(sp.a) * dist * 0.5).toFixed(1));
        sp.node.setAttribute("opacity", (i < 3 + flowIn * 11 ? Math.sin(p * Math.PI) * 0.75 : 0).toFixed(2));
      });
      casingBubbles.forEach((b) => {
        const p = (t * 0.6 + b.off) % 1;
        b.node.setAttribute("cy", (lerp(326, waterY + 2, p)).toFixed(1));
        b.node.setAttribute("opacity", (still ? 0 : cur.pump * (1 - cur.dry) * 0.6 * Math.sin(p * Math.PI)).toFixed(2));
      });
      // a burning-up pump: black smoke billows out of the well cap and sparks fly around the motor
      smoke.forEach((s, i) => {
        const p = still ? (i % 5) * 0.18 + 0.05 : (t * 0.4 + s.off) % 1;
        s.node.setAttribute("cx", (128 + Math.sin(p * 6 + i) * 5 - p * 22).toFixed(1));
        s.node.setAttribute("cy", (186 - p * 90).toFixed(1));
        s.node.setAttribute("r", (3 + p * 11).toFixed(1));
        s.node.setAttribute("opacity", (cur.dry * (1 - p * 0.8) * 0.9).toFixed(2));
      });
      sparks.forEach((sp, i) => {
        const p = still ? 0.5 : (t * 2.2 + i / 6) % 1, a = sp.a + (still ? 0 : t);
        sp.node.setAttribute("transform", `translate(${(128 + Math.cos(a) * (4 + p * 8)).toFixed(1)} ${(337 + Math.sin(a) * (3 + p * 6)).toFixed(1)}) scale(${(1.4 - p).toFixed(2)})`);
        sp.node.setAttribute("opacity", (cur.dry * (still ? 1 : Math.sin(p * Math.PI))).toFixed(2));
      });
      alarm.setAttribute("opacity", (cur.dry * (still ? 0.8 : 0.4 + 0.4 * Math.sin(t * 10))).toFixed(2));

      // ----- pipes: dots ride from the pump to the tank while it runs, and up into the house while taps are open -----
      if (!still) { cur.feedPh = (cur.feedPh + dt * 0.25 * (1 - cur.dry * 0.8)) % 1; cur.housePh = (cur.housePh + dt * 0.4 * pf) % 1; }
      ride(feedDots, [[128, 330], [128, 238], [236, 238]], cur.feedPh, cur.pump * (1 - cur.dry * 0.85));
      ride(houseDots, [[268, 238], [290, 238], [290, 203]], cur.housePh, cur.house * pf);

      // ----- basement: switch light, tank level, gauge -----
      el.hwSwitchLed.setAttribute("opacity", cur.pump > 0.5 ? 1 : 0.25);
      const wTop = 245 - 31 * (0.1 + 0.75 * cur.tank);
      let d = "M242 246";
      for (let x = 242; x <= 262; x += 2) d += `L${x} ${(wTop + (still ? 0 : Math.sin(x * 0.5 + t * 3) * 0.5)).toFixed(2)}`;
      el.hwTankWater.setAttribute("d", d + "L262 246Z");
      el.hwFlame.setAttribute("transform", `translate(308 245) scale(${still ? 1 : (0.85 + Math.sin(t * 13) * 0.15).toFixed(2)}) translate(-308 -245)`);
      el.hwNeedle.setAttribute("transform", `rotate(${psiAngle(cur.psi).toFixed(1)} ${GAUGE.x} ${GAUGE.y})`);
      el.hwPsiTag.textContent = `${lost ? 0 : Math.round(cur.psi)} PSI`;
      el.hwGaugeGreen.setAttribute("stroke-width", (2.2 + cur.party * (still ? 1 : 1 + Math.sin(t * 6))).toFixed(2));

      // ----- fixtures -----
      el.hwFaucet.setAttribute("opacity", (cur.kitchen * (0.3 + 0.7 * pf)).toFixed(2));
      el.hwFaucet.setAttribute("stroke-dashoffset", still ? 0 : ((-t * 30) % 50).toFixed(1));
      el.hwDishLed.setAttribute("opacity", T.dishes ? (still || Math.sin(t * 5) > 0 ? 1 : 0.3) : 0.3);
      el.hwDrumWater.setAttribute("y", (193 - cur.washer * 5).toFixed(1));
      drum.forEach((c) => {
        const a = c.a + (still ? 0 : t * 4 * cur.washer);
        c.node.setAttribute("cx", (339 + Math.cos(a) * 4).toFixed(1));
        c.node.setAttribute("cy", (185 + Math.sin(a) * 4).toFixed(1));
      });

      // ----- yard: sprinkler jets, wet lawn, garden hose, the cow at the stock tank -----
      el.hwSprinklerG.setAttribute("opacity", cur.owned.toFixed(2));
      el.hwGardenG.setAttribute("opacity", cur.gOwned.toFixed(2));
      const jetOn = cur.owned * (1 - cur.dry) * Math.max(cur.sprinkler, cur.party); // it runs on its hours, and for the celebration
      const reach = 0.35 + 0.65 * Math.min(1, pf * 1.1);
      const sweep = still ? 0 : Math.sin(t * 1.6);
      jets.forEach((j, i) => {
        const dx = j.dx * reach, hgt = 16 * reach + Math.abs(j.dx) * 0.15;
        j.node.setAttribute("d", `M66 191Q${(66 + dx * 0.5).toFixed(1)} ${(191 - hgt * 2).toFixed(1)} ${(66 + dx).toFixed(1)} 199`);
        const near = 1 - Math.min(1, Math.abs(sweep - j.dx / 38) * 0.8);
        j.node.setAttribute("opacity", (jetOn * (0.35 + 0.65 * near)).toFixed(2));
        j.node.setAttribute("stroke-dashoffset", still ? 0 : ((-t * 24 - i) % 46).toFixed(1));
      });
      el.hwSprinkHead.setAttribute("transform", `rotate(${(sweep * 25 * jetOn).toFixed(1)} 66 192)`);
      el.hwWet.setAttribute("opacity", (cur.owned * Math.max(cur.sprinkler * 0.6, cur.party * 0.4)).toFixed(2));
      el.hwHoseSpray.setAttribute("opacity", (cur.garden * pf).toFixed(2));
      el.hwHoseSpray.setAttribute("stroke-dashoffset", still ? 0 : ((-t * 20) % 45).toFixed(1));
      el.hwTroughWater.setAttribute("opacity", (0.6 + 0.4 * cur.gOwned).toFixed(2));
      grass.forEach((g) => {
        const lean = still ? 0 : Math.sin(t * 1.3 + g.ph) * 3;
        g.node.setAttribute("transform", `translate(${g.x} 200) rotate(${lean.toFixed(1)})`);
      });
      ripples.forEach((rp) => {
        rp.node.setAttribute("x", (rp.x + (still ? 0 : Math.sin(t * 0.4 + rp.ph) * 10)).toFixed(1));
        rp.node.setAttribute("opacity", (0.25 + (still ? 0 : 0.15 * Math.sin(t * 0.9 + rp.ph))).toFixed(2));
      });
      if (cow) cow.draw({ t, dt, still, on: T.gardenOwned, dying: false, delay: 0, death: "fall", level: 1, party });

      // ----- people -----
      const { roles, stalls } = cast(T);
      folks.forEach((f, i) => {
        const role = i < T.people ? roles[i] : null, key = role ? role.key : "";
        const c = f.cur;
        if (still) { // reduced motion: everyone is simply in their spot
          c.key = key;
          if (role) { c.x = role.x; c.y = role.y; }
          c.op = role ? 1 : 0;
        } else if (key !== c.key) { // fade out, step over to the new spot, fade back in
          c.op = approach(c.op, 0, dt, 10);
          if (c.op < 0.05) { c.key = key; if (role) { c.x = role.x; c.y = role.y; } }
        } else c.op = approach(c.op, role ? 1 : 0, dt, 6);
        f.g.setAttribute("opacity", c.op.toFixed(2));
        if (!role && c.op < 0.01) return;
        const pose = role ? role.pose : "stand", jump = cur.party * (still ? 0 : Math.abs(Math.sin(t * 6 + i)) * 4);
        const bob = still ? 0 : Math.sin(t * 2 + i) * 0.3, tap = pose === "wait" && !still ? Math.max(0, Math.sin(t * 8 + i)) * 0.6 : 0;
        f.g.setAttribute("transform", `translate(${c.x} ${(c.y - jump - tap).toFixed(1)}) scale(${f.s})`);
        f.head.setAttribute("transform", `translate(0 ${bob.toFixed(2)})`);
        f.towel.setAttribute("opacity", pose === "wait" ? 1 : 0);
        const wave = still ? 0.5 : Math.sin(t * 9 + i);
        const [l, r] = cur.party > 0.5 ? [150 + wave * 15, -150 - wave * 15]
          : pose === "sink" ? [12, -55 + (still ? 0 : Math.sin(t * 5) * 10)]
            : pose === "laundry" ? [70 + (still ? 0 : Math.sin(t * 3) * 8), -12]
              : pose === "hose" ? [75, -10]
                : pose === "wait" ? [10, -35] : [10, -10];
        f.arms[0].a.setAttribute("transform", `translate(-4.6 -22.6) rotate(${l.toFixed(1)})`);
        f.arms[1].a.setAttribute("transform", `translate(4.6 -22.6) rotate(${r.toFixed(1)})`);
        f.expr(lost || end === "thirsty" ? "shock" : cur.party > 0.5 ? "sing" : "smile");
      });

      // in the showers: scrubbing, singing in a celebration, shivering in a cold trickle, suds and "?!" when it dies
      stallFolks.forEach((list, k) => {
        const st = STALLS[k], who = stalls[k];
        list.forEach((sf, i) => {
          sf.op = still ? (i === who ? 1 : 0) : approach(sf.op, i === who ? 1 : 0, dt, 6);
          sf.g.setAttribute("opacity", sf.op.toFixed(2));
          if (sf.op < 0.01) return;
          const shiver = cold && !still ? Math.sin(t * 60) * 0.5 : 0;
          sf.g.setAttribute("transform", `translate(${(st.x + shiver).toFixed(2)} ${st.y}) scale(${sf.s})`);
          sf.g.classList.toggle("cold", cold);
          const scrub = still ? 0 : Math.sin(t * (party ? 10 : 6) + k) * 12;
          sf.arm.setAttribute("transform", `translate(4.4 -22.4) rotate(${(-150 + scrub).toFixed(1)})`);
          sf.expr(lost ? "shock" : cold ? "brr" : party ? "sing" : "smile");
          const soapy = lost || cold ? 1 : 0;
          sf.suds.forEach((b) => b.node.setAttribute("opacity", b.heavy ? soapy : 0.9));
        });
      });

      // spray from each shower head: strong and wide when pressure is good, a trickle when it isn't, air when it's dry
      sprays.forEach((sp, k) => {
        const st = STALLS[k], on = stalls[k] >= 0 ? 1 : 0;
        sp.cur.on = approach(sp.cur.on, on, dt, 6);
        sp.cur.f = approach(sp.cur.f, lost ? 0 : pf, dt, 5);
        const f = sp.cur.f, [nx, ny] = st.nozzle, len = st.floor - ny;
        sp.lines.forEach((ln, i) => {
          const u = (i - 3) / 3, show = i < 1 + Math.round(f * 6) ? 1 : 0;
          ln.setAttribute("x1", (nx + u * 3).toFixed(1));
          ln.setAttribute("y1", ny);
          ln.setAttribute("x2", (nx + u * (2 + f * 10)).toFixed(1));
          ln.setAttribute("y2", st.floor - (1 - f) * len * 0.15);
          ln.setAttribute("opacity", (sp.cur.on * show * (0.35 + 0.65 * f)).toFixed(2));
          ln.setAttribute("stroke-dashoffset", still ? 0 : ((-t * (8 + 40 * f) - i) % 50).toFixed(1));
        });
        sp.drips.forEach((dr) => {
          const p = still ? 0.5 : (t * 0.9 + dr.off) % 1;
          dr.node.setAttribute("cx", nx);
          dr.node.setAttribute("cy", (ny + p * len).toFixed(1));
          dr.node.setAttribute("opacity", (sp.cur.on * (f < 0.45 && !lost ? 1 : 0)).toFixed(2));
        });
        sp.puffs.forEach((pu, i) => {
          const p = still ? 0.5 : (t * 1.5 + pu.off) % 1;
          pu.node.setAttribute("cx", (nx + (i - 1) * 3 * p).toFixed(1));
          pu.node.setAttribute("cy", (ny + 2 + p * 6).toFixed(1));
          pu.node.setAttribute("r", (0.8 + p * 2.4).toFixed(1));
          pu.node.setAttribute("opacity", (sp.cur.on * (lost ? 1 - p : 0)).toFixed(2));
        });
        sp.steam.forEach((s, i) => {
          const p = still ? 0.5 : (t * 0.5 + s.off) % 1;
          s.node.setAttribute("transform", `translate(${(st.x - 8 + i * 8).toFixed(1)} ${(st.steam - p * 10).toFixed(1)})`);
          s.node.setAttribute("opacity", (sp.cur.on * (f > 0.6 && !cold ? 1 : 0) * Math.sin(p * Math.PI) * 0.8).toFixed(2));
        });
      });

      // ending effects around the upstairs shower
      const top = STALLS[0], head = [top.x, top.y - 40];
      notes.forEach((n, i) => {
        const p = still ? 0.3 + i * 0.25 : (t * 0.5 + n.off) % 1;
        n.node.setAttribute("transform", `translate(${(head[0] + 8 + p * 12 + Math.sin(p * 9) * 2).toFixed(1)} ${(head[1] + 4 - p * 16).toFixed(1)}) scale(.8)`);
        n.node.setAttribute("opacity", (cur.party * (stalls[0] >= 0 ? 1 : 0) * Math.sin(Math.min(1, p * 1.2) * Math.PI)).toFixed(2));
      });
      const pop = still ? 1 : 1 + Math.abs(Math.sin(t * 5)) * 0.15;
      shock.setAttribute("transform", `translate(${head[0] + 13} ${head[1] + 1}) scale(${(pop * 1.3).toFixed(2)})`);
      pfft.setAttribute("transform", `translate(${STALLS[0].nozzle[0] - 3} ${STALLS[0].nozzle[1] - 1 + (still ? 0 : Math.sin(t * 20) * 0.6)})`);
      pfft.setAttribute("opacity", lost && stalls[0] >= 0 ? (still || Math.sin(t * 7) > -0.4 ? 1 : 0) : 0);
      shock.setAttribute("opacity", lost && stalls[0] >= 0 ? 1 : 0);
      brr.setAttribute("transform", `translate(${head[0] + 13 + (still ? 0 : Math.sin(t * 40) * 0.6)} ${head[1] + 8})`);
      brr.setAttribute("opacity", cold && stalls[0] >= 0 ? 1 : 0);
      zs.forEach((z, i) => {
        const p = still ? 0.3 + i * 0.3 : (t * 0.35 + z.off) % 1;
        z.node.setAttribute("x", (300 + i * 6 + p * 16).toFixed(1));
        z.node.setAttribute("y", (126 - p * 22).toFixed(1));
        z.node.setAttribute("font-size", (6 + p * 5).toFixed(1));
        z.node.setAttribute("opacity", (cur.sleep * Math.sin(p * Math.PI)).toFixed(2));
      });

      // sleepers in the beds at night
      sleepers.forEach((s, i) => {
        s.op = approach(s.op, T.asleep && i < T.people ? 1 : 0, dt, 4);
        s.g.setAttribute("opacity", s.op.toFixed(2));
      });
      quilts.forEach((q, i) => q.setAttribute("opacity", (cur.sleep * (i === 0 || T.people > 4 ? 1 : 0)).toFixed(2)));
    }

    const anim = loop(svgEl, frame);
    return { set(next) { target = { ...target, ...next }; anim.invalidate(); } };
  }

  root.HouseScene = { create };
})(window);
