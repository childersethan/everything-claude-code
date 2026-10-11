/* Water Lab, irrigation well diagram: a center pivot over corn on top, the well running down through
   topsoil and caliche into the Ogallala, the pump at the bottom and the cone of depression around it.
   lab-irrigation.js decides the numbers; this file only draws them. Every value eases toward its target. */
(function (root) {
  "use strict";
  const { svg, approach, loop } = root.Motion;

  const W = 400, H = 620, GROUND = 150;
  const WELL_X = 92, CASING = 20, PIVOT_X = 150, PIPE_Y = 104;
  const TOWERS = [226, 302, 378];
  const NOZZLE = 16; // drops hang this far below the pivot pipe
  const PUMP_S = 1.3; // the pump is drawn a bit oversized so its face reads
  // topsoil and caliche are drawn a fixed cartoon thickness; below them the picture zooms to fit the well
  const TOP_Y = 162, CAL_Y = 186, CALICHE_FT = 60;
  const scaleFor = (deepest) => (H - 34 - CAL_Y) / (Math.max(300, deepest) - CALICHE_FT); // px per foot
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  const f1 = (n) => n.toFixed(1);

  /** Mixes two #rrggbb colors; k = 0 gives `a`. */
  function mix(a, b, k) {
    const p = (c, i) => parseInt(c.slice(i, i + 2), 16);
    return "#" + [1, 3, 5].map((i) => Math.round(lerp(p(a, i), p(b, i), clamp01(k))).toString(16).padStart(2, "0")).join("");
  }

  /** Ink-outlined sky, hills, sun and clouds, the same flat style as the livestock diagram. */
  function buildSky(g) {
    svg("rect", { x: 0, y: 0, width: W, height: GROUND, fill: "url(#iwSky)" }, g);
    const sun = svg("g", { class: "iw-sun" }, g);
    const rays = svg("g", {}, sun);
    for (let i = 0; i < 10; i++) svg("line", { x1: 0, y1: -16, x2: 0, y2: -21, stroke: "var(--signal)", "stroke-width": 2, "stroke-linecap": "round", transform: `rotate(${i * 36})` }, rays);
    svg("circle", { r: 12 }, sun);
    const cloudG = svg("g", { class: "cloud" }, g);
    const clouds = [{ x: 30, y: 18, s: 1 }, { x: 210, y: 10, s: 0.7 }, { x: 300, y: 52, s: 0.55 }, { x: 120, y: 40, s: 0.6 }].map((c) =>
      ({ ...c, node: svg("path", { d: "M0 10a7 7 0 0 1 7-7 9 9 0 0 1 16-3 7 7 0 0 1 11 4 6 6 0 0 1 2 12H3a5 5 0 0 1-3-6z" }, cloudG) }));
    const shade = svg("rect", { class: "sky-shade", x: 0, y: 0, width: W, height: GROUND, opacity: 0 }, g);
    const heat = svg("rect", { class: "sky-heat", x: 0, y: 0, width: W, height: GROUND, opacity: 0 }, g);
    return { sun, rays, clouds, shade, heat };
  }

  /** A rainbow over the field for the celebration. */
  function buildRainbow(g) {
    const rb = svg("g", { class: "iw-rainbow", opacity: 0, "clip-path": "url(#iwSkyClip)" }, g);
    ["#e5484d", "#f5a524", "#f5d90a", "#46a758", "#0090ff", "#6e56cf"].forEach((c, i) =>
      svg("path", { d: `M${190 + i * 5} 150A${110 - i * 5} ${96 - i * 5} 0 0 1 ${410 - i * 5} 150`, stroke: c, "stroke-width": 5, fill: "none", "stroke-opacity": 0.8 }, rb));
    return rb;
  }

  /** The field at the horizon: hills, a band of corn rows and the little pivots on the neighbors' quarters. */
  function buildField(g) {
    svg("path", { class: "hill", d: "M0 124Q60 112 130 120T260 116T400 120V130H0Z" }, g);
    const band = svg("path", { class: "iw-field", d: "M0 126H400V150H0Z" }, g);
    const rows = svg("g", { class: "iw-rows" }, g);
    for (let i = 0; i < 5; i++) svg("path", { d: `M0 ${129 + i * 4.6}H400`, "stroke-width": 1.4 + i * 0.5, "stroke-dasharray": `${3 + i} ${2 + i * 0.6}` }, rows);
    // pivots two and three, far off on the horizon
    const far = [{ x: 186, len: 92 }, { x: 292, len: 96 }].map((p) => {
      const node = svg("g", { class: "iw-far", opacity: 0, transform: `translate(${p.x} 0)` }, g);
      svg("path", { d: `M0 128V116M-3 128 0 116 3 128M0 116H${p.len}`, class: "iw-far-pipe" }, node);
      [0.45, 0.9].forEach((k) => svg("path", { d: `M${p.len * k - 3} 128 ${p.len * k} 116 ${p.len * k + 3} 128`, class: "iw-far-pipe" }, node));
      const mist = Array.from({ length: 10 }, (_, i) => svg("circle", { cx: 6 + i * (p.len - 8) / 9, cy: 120, r: 0.9, class: "iw-spray" }, node));
      return { node, mist, len: p.len };
    });
    return { band, rows, far };
  }

  /** Layers of the ground: topsoil, caliche, dry sand and gravel, the saturated aquifer and the red bed below. */
  function buildGround(g) {
    svg("rect", { x: 0, y: GROUND, width: W, height: H - GROUND, class: "iw-sand" }, g);
    const water = svg("path", { fill: "url(#iwAq)" }, g);
    const ghost = svg("g", { opacity: 0 }, g); // where the water table started the season
    const ghostLine = svg("path", { class: "iw-ghost" }, ghost);
    const ghostTag = svg("text", { x: 394, "text-anchor": "end", class: "iw-ghost-tag" }, ghost);
    ghostTag.textContent = "JUNE";
    svg("rect", { x: 0, y: CAL_Y, width: W, height: H, fill: "url(#iwGravel)", class: "iw-gravel" }, g);
    const specks = svg("g", { class: "iw-specks" }, g);
    const surface = svg("path", { class: "iw-wt" }, g);
    svg("rect", { x: 0, y: GROUND, width: W, height: TOP_Y - GROUND, fill: "var(--soil-1)" }, g);
    svg("path", { fill: "var(--rock)", d: `M0 ${TOP_Y}H400V${CAL_Y - 2}Q360 ${CAL_Y + 3} 320 ${CAL_Y}T240 ${CAL_Y + 1}T160 ${CAL_Y - 1}T80 ${CAL_Y + 2}T0 ${CAL_Y}Z` }, g);
    const lumps = svg("g", { class: "iw-caliche" }, g);
    [[18, 170, 9], [64, 178, 6], [130, 168, 8], [176, 179, 5], [226, 172, 10], [290, 180, 6], [340, 169, 8], [384, 177, 6]].forEach(([x, y, r]) =>
      svg("ellipse", { cx: x, cy: y, rx: r, ry: r * 0.45 }, lumps));
    const bed = svg("path", { class: "iw-bed" }, g);
    const bedLines = svg("path", { class: "iw-bed-line" }, g);
    const flow = Array.from({ length: 14 }, (_, i) => ({ side: i % 2 ? 1 : -1, off: (i * 0.29) % 1, lane: (i * 0.41) % 1, node: svg("circle", { r: 1.2 }, specks) }));
    return { water, ghost, ghostLine, ghostTag, surface, bed, bedLines, flow };
  }

  /** The well: steel casing, slotted screen through the aquifer, water inside, drop pipe and the submersible pump. */
  function buildWell(g) {
    const casing = svg("rect", { x: WELL_X - CASING / 2, y: GROUND - 10, width: CASING, height: 200, fill: "url(#iwSteel)", stroke: "var(--ink)", "stroke-width": 2 }, g);
    const inner = svg("rect", { x: WELL_X - 8, y: GROUND - 8, width: 16, height: 200, class: "iw-bore" }, g);
    const clip = svg("g", { "clip-path": "url(#iwCasingClip)" }, g);
    const water = svg("rect", { x: WELL_X - 8, y: 0, width: 16, height: 900, fill: "var(--water)", "fill-opacity": 0.75 }, clip);
    const shine = svg("path", { class: "iw-shine", d: "" }, clip);
    const slots = svg("path", { class: "iw-slots" }, g);
    const pipe = svg("line", { x1: WELL_X, x2: WELL_X, y1: GROUND - 8, y2: 300, stroke: "var(--ink)", "stroke-width": 2.6 }, g);
    const flowDots = svg("g", {}, g);
    const rising = Array.from({ length: 8 }, () => svg("circle", { r: 1.1, class: "drop-dot" }, flowDots));
    const bubbles = Array.from({ length: 9 }, (_, i) => ({ off: (i * 0.37) % 1, dx: ((i * 7) % 9) - 4, node: svg("circle", { r: 1 + (i % 3) * 0.5, class: "iw-bubble" }, g) }));

    const glow = svg("circle", { r: 34, fill: "url(#iwGlow)", opacity: 0 }, g);
    const pump = svg("g", {}, g);
    const body = svg("rect", { x: -6, y: -26, width: 12, height: 24, rx: 2.5, stroke: "var(--ink)", "stroke-width": 1.2 }, pump);
    svg("path", { d: "M-6 -20h12M-6 -8h12", stroke: "var(--ink)", "stroke-opacity": 0.45, "stroke-width": 0.8 }, pump);
    const face = svg("g", {}, pump);
    const eyesOk = svg("g", {}, face);
    svg("circle", { cx: -2.4, cy: -15, r: 1.1, fill: "var(--ink)" }, eyesOk);
    svg("circle", { cx: 2.4, cy: -15, r: 1.1, fill: "var(--ink)" }, eyesOk);
    const eyesHappy = svg("path", { d: "M-3.6 -14.4q1.2-1.8 2.4 0M1.2 -14.4q1.2-1.8 2.4 0", stroke: "var(--ink)", "stroke-width": 0.9, fill: "none", opacity: 0 }, face);
    const eyesX = svg("path", { d: "M-3.6 -16.2l2.4 2.4M-1.2 -16.2l-2.4 2.4M1.2 -16.2l2.4 2.4M3.6 -16.2l-2.4 2.4", stroke: "#fff", "stroke-width": 1, opacity: 0 }, face);
    const mouth = svg("path", { d: "M-2 -11q2 1.6 4 0", stroke: "var(--ink)", "stroke-width": 0.9, fill: "none" }, face);
    svg("rect", { x: -6.5, y: -2, width: 13, height: 4, class: "iw-intake", stroke: "var(--ink)", "stroke-width": 0.8 }, pump);
    svg("path", { d: "M-4 -2v4M-1.3 -2v4M1.3 -2v4M4 -2v4", stroke: "var(--ink)", "stroke-width": 0.6 }, pump);
    const motor = svg("rect", { x: -5.5, y: 2, width: 11, height: 13, rx: 2, class: "iw-motor", stroke: "var(--ink)", "stroke-width": 1.2 }, pump);

    const tags = svg("g", { class: "iw-labels iw-tags", "font-family": "JetBrains Mono, monospace", "font-size": 8, "font-weight": 700 }, g);
    const levelTag = svg("text", { x: WELL_X + 17, fill: "#fff" }, tags);
    const intakeTag = svg("text", { x: WELL_X + 17, fill: "#fff" }, tags);
    const intakeLine = svg("line", { x1: WELL_X + 9, x2: WELL_X + 14, class: "iw-tick" }, g);
    const levelLine = svg("line", { x1: WELL_X + 9, x2: WELL_X + 14, class: "iw-tick" }, g);
    return { casing, inner, water, shine, slots, pipe, rising, bubbles, glow, pump, body, eyesOk, eyesHappy, eyesX, mouth, motor, tags, levelTag, intakeTag, intakeLine, levelLine };
  }

  /** A round dial: face, colored zones, ticks, a needle and a readout below. */
  function buildDial(g, cx, cy, label, zones) {
    const R = 15, arc = (a0, a1, r) => {
      const p = (a) => `${f1(cx + r * Math.sin(a))} ${f1(cy - r * Math.cos(a))}`;
      return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
    };
    const A = (k) => -2.2 + k * 4.4; // the needle sweeps about 250 degrees
    svg("circle", { cx, cy, r: R + 2, class: "iw-dial-rim" }, g);
    svg("circle", { cx, cy, r: R, class: "iw-dial" }, g);
    zones.forEach(([k0, k1, cls]) => svg("path", { d: arc(A(k0), A(k1), R - 3), class: "iw-zone " + cls }, g));
    for (let i = 0; i <= 8; i++) {
      const a = A(i / 8);
      svg("line", { x1: f1(cx + (R - 1) * Math.sin(a)), y1: f1(cy - (R - 1) * Math.cos(a)), x2: f1(cx + (R - 4.5) * Math.sin(a)), y2: f1(cy - (R - 4.5) * Math.cos(a)), stroke: "var(--ink)", "stroke-width": 0.6 }, g);
    }
    const needle = svg("path", { d: `M${cx - 1.2} ${cy}L${cx} ${cy - R + 3}L${cx + 1.2} ${cy}Z`, class: "iw-needle" }, g);
    svg("circle", { cx, cy, r: 2, fill: "var(--ink)" }, g);
    const read = svg("text", { x: cx, y: cy + R + 11, "text-anchor": "middle", class: "iw-read" }, g);
    svg("text", { x: cx, y: cy + R + 18, "text-anchor": "middle", class: "iw-dial-label" }, g).textContent = label;
    return { needle, read, set(k, text) { needle.setAttribute("transform", `rotate(${f1((A(clamp01(k)) * 180) / Math.PI)} ${cx} ${cy})`); if (read.textContent !== text) read.textContent = text; } };
  }

  /** The control panel by the wellhead with the gpm gauge, the water-over-pump gauge and a status light. */
  function buildPanel(g) {
    svg("path", { d: "M20 150V132M68 150V132", stroke: "var(--ink)", "stroke-width": 2.4, "stroke-linecap": "round" }, g);
    svg("rect", { x: 6, y: 64, width: 76, height: 70, rx: 4, class: "iw-box", stroke: "var(--ink)", "stroke-width": 2 }, g);
    svg("path", { d: "M4 64h80", stroke: "var(--ink)", "stroke-width": 3, "stroke-linecap": "round" }, g);
    const lamp = svg("circle", { cx: 74, cy: 71, r: 3, class: "iw-lamp" }, g);
    const gpm = buildDial(g, 25, 92, "GPM", [[0, 0.62, "ok"], [0.62, 0.82, "warn"], [0.82, 1, "bad"]]);
    const left = buildDial(g, 63, 92, "OVER PUMP", [[0, 0.12, "bad"], [0.12, 0.3, "warn"], [0.3, 1, "ok"]]);
    svg("path", { d: "M82 118Q88 120 88 136", stroke: "var(--ink)", "stroke-width": 1.2, fill: "none" }, g); // power to the wellhead
    return { lamp, gpm, left };
  }

  /** Wellhead and the pipe over to the pivot. */
  function buildHead(g) {
    svg("rect", { x: WELL_X - 10, y: 134, width: 20, height: 16, rx: 2, class: "iw-head", stroke: "var(--ink)", "stroke-width": 1.8 }, g);
    svg("path", { d: `M${WELL_X - 12} 134h24`, stroke: "var(--ink)", "stroke-width": 2.6, "stroke-linecap": "round" }, g);
    svg("path", { d: `M${WELL_X + 10} 141H${PIVOT_X - 4}`, class: "iw-main", "stroke-width": 4.5 }, g);
    const pulse = svg("path", { d: `M${WELL_X + 10} 141H${PIVOT_X - 4}`, class: "iw-pulse" }, g);
    svg("circle", { cx: 120, cy: 141, r: 3.4, class: "iw-valve", stroke: "var(--ink)", "stroke-width": 1 }, g); // flow meter
    return { pulse };
  }

  /** The pivot: center tower, spans hung on trusses, drive towers with wheels, drops and their spray. */
  function buildPivot(g) {
    svg("path", { d: `M${PIVOT_X - 9} 150 ${PIVOT_X} ${PIPE_Y + 2} ${PIVOT_X + 9} 150M${PIVOT_X - 6} 134h12M${PIVOT_X - 4} 120h8`, stroke: "var(--ink)", "stroke-width": 2.2, fill: "none", "stroke-linejoin": "round" }, g);
    svg("path", { d: `M${PIVOT_X} 150V${PIPE_Y}`, stroke: "var(--ink)", "stroke-width": 3 }, g);
    const spans = svg("g", {}, g);
    const xs = [PIVOT_X, ...TOWERS];
    const drops = [];
    xs.slice(1).forEach((x1, i) => {
      const x0 = xs[i], mid = (x0 + x1) / 2;
      svg("path", { d: `M${x0} ${PIPE_Y}Q${mid} ${PIPE_Y + 30} ${x1} ${PIPE_Y}`, class: "iw-truss" }, spans);
      for (let k = 1; k < 6; k++) {
        const x = lerp(x0, x1, k / 6), sag = PIPE_Y + 15 * (1 - Math.pow((x - mid) / ((x1 - x0) / 2), 2));
        svg("path", { d: `M${f1(x)} ${PIPE_Y}L${f1(x)} ${f1(sag)}`, class: "iw-truss thin" }, spans);
      }
      for (let k = 0; k < 6; k++) drops.push(lerp(x0, x1, (k + 0.5) / 6));
    });
    svg("path", { d: `M${PIVOT_X} ${PIPE_Y}H${TOWERS[2] + 4}`, class: "iw-span" }, spans);
    const hoses = svg("g", { class: "iw-hose" }, g);
    drops.forEach((x) => { svg("path", { d: `M${f1(x)} ${PIPE_Y}V${PIPE_Y + NOZZLE - 1}` }, hoses); svg("circle", { cx: f1(x), cy: PIPE_Y + NOZZLE, r: 1.4, class: "iw-nozzle" }, hoses); });
    const wheels = TOWERS.map((x) => {
      svg("path", { d: `M${x - 13} 144L${x} ${PIPE_Y}L${x + 13} 144M${x - 9} 132h18`, stroke: "var(--ink)", "stroke-width": 2, fill: "none", "stroke-linejoin": "round" }, g);
      svg("rect", { x: x - 4, y: 112, width: 8, height: 7, rx: 1, class: "iw-gear", stroke: "var(--ink)", "stroke-width": 1 }, g);
      return [-13, 13].map((dx) => {
        const w = svg("g", { transform: `translate(${x + dx} 144)` }, g);
        svg("circle", { r: 5.5, class: "iw-tire" }, w);
        const hub = svg("g", {}, w);
        svg("path", { d: "M-3.5 0h7M0 -3.5v7", stroke: "var(--surface)", "stroke-width": 1 }, hub);
        return hub;
      });
    }).flat();
    // end gun throws an arc of water past the last tower
    const gun = svg("path", { d: `M${TOWERS[2] - 2} ${PIPE_Y}l6 -5`, stroke: "var(--ink)", "stroke-width": 2, "stroke-linecap": "round" }, g);
    const spray = svg("g", { class: "iw-spray" }, g);
    const cones = drops.map((x) => svg("path", { d: `M${f1(x)} ${PIPE_Y + NOZZLE + 1}l-7 18q7 3 14 0Z`, class: "iw-mist" }, spray));
    const mist = drops.map((x, i) => Array.from({ length: 4 }, (_, k) => ({ x, off: ((i * 0.31) + k / 4) % 1, dir: (k - 1.5) / 1.5, node: svg("circle", { r: 1.25 }, spray) }))).flat();
    const gush = Array.from({ length: 14 }, (_, i) => ({ off: i / 14, node: svg("circle", { r: 1.4 }, spray) }));
    return { wheels, mist, cones, gush, gun, drops };
  }

  /** A row of corn along the near edge of the field. */
  function buildCorn(g) {
    const plants = [];
    for (let x = 160; x < W + 4; x += 9.5) {
      const node = svg("g", {}, g);
      const stalk = svg("path", { d: "M0 0C.6 -10 -.6 -20 0 -30", "stroke-width": 1.9, fill: "none", class: "iw-stalk" }, node);
      const leaves = svg("path", { d: "M0 -7q7-6 12-1q-6-2-12 3ZM0 -13q-7-6-12-1q6-2 12 3ZM0 -19q6-6 11-2q-5-1-11 4ZM0 -24q-5-5-9-2q4-1 9 4Z", class: "iw-leaf" }, node);
      const ear = svg("ellipse", { cx: 2.2, cy: -15, rx: 1.6, ry: 3.6, class: "iw-ear", transform: "rotate(20 2.2 -15)" }, node);
      const tassel = svg("path", { d: "M0 -30l-2.5-4M0 -30v-5.5M0 -30l2.5-4", "stroke-width": 0.9, fill: "none", class: "iw-tassel" }, node);
      plants.push({ x, ph: x * 0.37, h: 0.88 + ((x * 13) % 7) / 50, node, stalk, leaves, tassel, ear });
    }
    return plants;
  }

  /** Smoke, sparks, a cartoon KA-CHUNK and the pump's thumbs up. */
  function buildFx(g) {
    const smoke = Array.from({ length: 12 }, (_, i) => ({ off: i / 12, dx: ((i * 5) % 11) - 5, top: i % 2 === 0, node: svg("circle", { class: "iw-smoke" }, g) }));
    const sparks = svg("g", { class: "iw-sparks" }, g);
    const sparkLines = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * Math.PI * 2, node: svg("line", {}, sparks) }));
    const bang = svg("g", { class: "iw-bang", opacity: 0 }, g);
    const star = [];
    for (let i = 0; i < 24; i++) { const r = i % 2 ? 22 : 34, a = (i / 24) * Math.PI * 2; star.push(`${f1(Math.cos(a) * r * 2.2)} ${f1(Math.sin(a) * r)}`); }
    svg("path", { d: "M" + star.join("L") + "Z", class: "iw-bang-star" }, bang);
    svg("text", { y: 6, "text-anchor": "middle", class: "iw-bang-text" }, bang).textContent = "KA-CHUNK!";
    const thumb = svg("g", { class: "iw-thumb", opacity: 0 }, g);
    svg("path", { d: "M-15 0a15 15 0 1 1 6 12l-9 5 3-9a15 15 0 0 1 0-8Z", class: "iw-bubble-talk" }, thumb);
    svg("path", { d: "M-5 9V-1l4-8a2 2 0 0 1 3.4 1.7L1.2-3h5.6a2.2 2.2 0 0 1 2.1 2.7l-1.6 7.6A2.2 2.2 0 0 1 5.1 9ZM-9.5-1h3.6V9.5h-3.6Z", class: "iw-thumb-hand" }, thumb);
    const steam = svg("g", { class: "iw-steam", opacity: 0 }, g);
    const steamLines = [-6, 0, 6].map((dx) => svg("path", { d: `M${dx} 0q-3-4 0-8t0-8` }, steam));
    return { smoke, sparkLines, sparks, bang, thumb, steam, steamLines };
  }

  /** Rain and heat shimmer over the field. */
  function buildWeather(g) {
    const rainG = svg("g", { class: "rain", opacity: 0 }, g);
    const rain = Array.from({ length: 22 }, (_, i) => ({ x: (i * 53) % W, off: (i * 0.37) % 1, node: svg("line", { y1: 0, y2: 7 }, rainG) }));
    const shimmerG = svg("g", { class: "iw-shimmer", opacity: 0 }, g);
    const shimmer = [60, 160, 250, 340].map((x, i) => ({ x, ph: i, node: svg("path", {}, shimmerG) }));
    return { rainG, rain, shimmerG, shimmer };
  }

  /** Layer names along the right edge; each follows its layer as the controls change. */
  function buildLabels(g) {
    const t = svg("g", { class: "iw-labels", "font-family": "JetBrains Mono, monospace", "font-size": 8.5, "letter-spacing": 1, "text-anchor": "end" }, g);
    const mk = (y, text, fill) => { const n = svg("text", { x: 394, y, fill, class: fill === "#fff" ? "" : "plain" }, t); n.textContent = text; return n; };
    return {
      topsoil: mk(TOP_Y - 3, "TOPSOIL", "var(--ink)"), caliche: mk(CAL_Y - 7, "CALICHE", "#fff"),
      dry: mk(0, "DRY SAND & GRAVEL", "#fff"), aq: mk(0, "OGALLALA AQUIFER", "#fff"), bed: mk(0, "RED BED (BEDROCK)", "#fff"), sat: mk(0, "", "#fff")
    };
  }

  /** Depth marks down the left edge, so the zoomed picture still reads in feet. */
  function buildRuler(g) {
    const r = svg("g", { class: "iw-labels iw-ruler", "font-family": "JetBrains Mono, monospace", "font-size": 7 }, g);
    return Array.from({ length: 14 }, () => ({ tick: svg("line", { x1: 0, x2: 5 }, r), text: svg("text", { x: 7, fill: "#fff" }, r) }));
  }

  function create(svgEl) {
    const rootG = svgEl.querySelector("#iwRoot");
    const clipR = svgEl.querySelector("#iwCasingClipR");
    const layer = () => svg("g", {}, rootG);
    const sky = buildSky(layer());
    const rainbow = buildRainbow(layer());
    const field = buildField(layer());
    const ground = buildGround(layer());
    const labels = buildLabels(layer());
    const ruler = buildRuler(layer());
    const well = buildWell(layer());
    const weather = buildWeather(layer());
    const panel = buildPanel(layer());
    const head = buildHead(layer());
    const pivot = buildPivot(layer());
    const corn = buildCorn(layer());
    const fx = buildFx(layer());

    let target = { sat: 120, dtw: 180, gpm: 800, q: 800, pivots: 1, weather: "clear", drawdown: 70, regional: 0, grow: 0.8, health: 1, spray: 1, mode: "run" };
    const cur = { k: scaleFor(300), sat: 120, dtw: 180, q: 0, draw: 0, regional: 0, ghost: 0, grow: 0.8, health: 1, spray: 0, far2: 0, far3: 0, dark: 0, heat: 0, rain: 0, cool: 0,
      sunY: 34, hot: 0, burnt: 0, smoke: 0, party: 0, air: 0, deadT: 0, wheel: 0, flowPh: 0, needle: 0, left: 1 };

    function frame(dt, t, still) {
      const T = target, dead = T.mode === "dead", party = T.mode === "party", air = T.mode === "air" || dead;
      // eased values: the ground glides, water levels move like water, the crop changes slowly
      cur.sat = approach(cur.sat, T.sat, dt, 6);
      cur.dtw = approach(cur.dtw, T.dtw, dt, 6);
      cur.regional = approach(cur.regional, T.regional, dt, 3);
      cur.ghost = approach(cur.ghost, T.regional > 0.5 ? 1 : 0, dt, 3);
      cur.q = approach(cur.q, dead ? 0 : T.q, dt, dead ? 1.5 : 3);
      cur.draw = approach(cur.draw, T.drawdown, dt, 2.2);
      cur.grow = approach(cur.grow, T.grow, dt, 2);
      cur.health = approach(cur.health, T.health, dt, 1.4);
      cur.spray = approach(cur.spray, dead ? 0 : T.spray, dt, dead ? 1.2 : 3);
      cur.far2 = approach(cur.far2, T.pivots >= 2 ? 1 : 0, dt, 4);
      cur.far3 = approach(cur.far3, T.pivots >= 3 ? 1 : 0, dt, 4);
      cur.party = approach(cur.party, party ? 1 : 0, dt, 2);
      cur.air = approach(cur.air, air ? 1 : 0, dt, 3);
      cur.deadT = dead ? (still ? 9 : cur.deadT + dt) : 0;
      const boom = dead && cur.deadT > 0.9; // a second of sputtering, then the motor goes
      cur.hot = approach(cur.hot, dead ? (boom ? 1 : 0.7) : T.mode === "air" ? 0.5 : 0, dt, dead ? 2.5 : 3);
      cur.burnt = approach(cur.burnt, boom ? 1 : 0, dt, 3);
      cur.smoke = approach(cur.smoke, boom ? 1 : 0, dt, 1.5);
      const W8 = T.weather;
      cur.dark = approach(cur.dark, W8 === "rain" ? 1 : W8 === "cool" ? 0.35 : 0, dt, 2);
      cur.heat = approach(cur.heat, W8 === "heat" ? 1 : W8 === "hot" ? 0.45 : 0, dt, 2);
      cur.rain = approach(cur.rain, W8 === "rain" ? 1 : 0, dt, 2);

      // ----- ground and water -----
      cur.k = approach(cur.k, scaleFor(T.dtw + T.sat), dt, 4);
      const yAt = (ft) => CAL_Y + (ft - CALICHE_FT) * cur.k;
      const topFt = cur.dtw + cur.regional, bottomFt = cur.dtw + cur.sat;
      const wt = yAt(topFt), bottom = yAt(bottomFt), intakeY = yAt(bottomFt - 15);
      const s = Math.max(0, Math.min(cur.draw * cur.k, intakeY - wt)); // the cone can't go below the intake
      const R = Math.min(260, 40 + s * 1.3);
      let water = "M0 " + f1(H);
      let line = "";
      for (let x = 0; x <= W; x += 4) {
        const d = Math.abs(x - WELL_X), y = wt + s * Math.pow(Math.max(0, 1 - d / R), 2.4);
        water += `L${x} ${f1(y)}`;
        line += (x ? "L" : "M") + `${x} ${f1(y)}`;
      }
      ground.water.setAttribute("d", water + `L${W} ${H}Z`);
      ground.surface.setAttribute("d", line);
      const g0 = yAt(cur.dtw);
      ground.ghostLine.setAttribute("d", `M${WELL_X + 12} ${f1(g0)}H${W}`);
      ground.ghostTag.setAttribute("y", f1(g0 - 2.5));
      ground.ghost.setAttribute("opacity", f1(cur.ghost * 0.9));
      let bed = `M0 ${f1(bottom + 2)}`;
      for (let x = 0; x <= W; x += 20) bed += `L${x} ${f1(bottom + Math.sin(x * 0.05) * 2.4)}`;
      ground.bed.setAttribute("d", bed + `L${W} ${H}L0 ${H}Z`);
      ground.bedLines.setAttribute("d", `M0 ${f1(bottom + 9)}Q100 ${f1(bottom + 6)} 200 ${f1(bottom + 10)}T400 ${f1(bottom + 8)}M0 ${f1(bottom + 17)}Q120 ${f1(bottom + 20)} 240 ${f1(bottom + 15)}T400 ${f1(bottom + 18)}`);
      // groundwater creeping in toward the well while it pumps
      const qk = clamp01(cur.q / 1200);
      ground.flow.forEach((f) => {
        const p = (t * (0.12 + qk * 0.35) + f.off) % 1, dist = (1 - p) * 120;
        const y = lerp(wt + s * 0.5 + 6, bottom - 6, f.lane);
        const x = WELL_X + f.side * (dist + 8);
        f.node.setAttribute("cx", f1(x));
        f.node.setAttribute("cy", f1(lerp(y, intakeY, p * p)));
        f.node.setAttribute("opacity", f1(Math.sin(p * Math.PI) * 0.75 * qk * (bottom - wt > 12 ? 1 : 0)));
      });

      const stepFt = cur.k > 0.9 ? 50 : 100;
      ruler.forEach((m, i) => {
        const ft = (i + 1) * stepFt, y = yAt(ft), on = ft > 90 && y < H - 8;
        m.tick.setAttribute("y1", f1(y)); m.tick.setAttribute("y2", f1(y));
        m.text.setAttribute("y", f1(y + 2.5));
        m.tick.setAttribute("opacity", on ? 0.8 : 0);
        m.text.setAttribute("opacity", on ? 0.85 : 0);
        if (m.text.textContent !== ft + " FT") m.text.textContent = ft + " FT";
      });

      // ----- the well -----
      const pwl = wt + s; // pumping water level in the casing
      well.casing.setAttribute("height", f1(bottom + 4 - (GROUND - 10)));
      well.inner.setAttribute("height", f1(bottom + 2 - (GROUND - 8)));
      clipR.setAttribute("y", f1(GROUND - 8));
      clipR.setAttribute("height", f1(bottom + 2 - (GROUND - 8)));
      const surge = air ? Math.sin(t * 9) * 1.4 * cur.air : 0;
      well.water.setAttribute("y", f1(Math.min(pwl, intakeY + 1) + surge));
      well.shine.setAttribute("d", `M${WELL_X - 8} ${f1(pwl + surge)}h16`);
      let slots = "";
      for (let y = Math.max(wt, CAL_Y + 6) + 4; y < bottom - 4; y += 5) slots += `M${WELL_X - 9} ${f1(y)}h3M${WELL_X + 6} ${f1(y)}h3`;
      well.slots.setAttribute("d", slots);
      const hum = cur.q > 50 && !dead ? Math.sin(t * 60) * 0.3 : 0;
      const shake = (cur.hot > 0.3 && !boom ? Math.sin(t * 80) * 1.2 * cur.hot : 0) + (boom && cur.deadT < 1.6 ? Math.sin(t * 95) * 2 : 0);
      well.pump.setAttribute("transform", `translate(${f1(WELL_X + hum + shake)} ${f1(intakeY)}) scale(${PUMP_S})`);
      well.pipe.setAttribute("y2", f1(intakeY - 26 * PUMP_S));
      well.glow.setAttribute("cx", WELL_X);
      well.glow.setAttribute("cy", f1(intakeY - 6));
      well.glow.setAttribute("opacity", f1(cur.hot * (0.75 + (still ? 0 : Math.sin(t * 13) * 0.25)) * (1 - cur.burnt * 0.6)));
      well.body.setAttribute("fill", mix(mix("#e8a50e", "#ff3b1f", cur.hot), "#2a2523", cur.burnt));
      well.motor.setAttribute("fill", mix(mix("#5b6770", "#ff6a1f", cur.hot), "#1b1716", cur.burnt));
      well.eyesOk.setAttribute("opacity", f1(1 - Math.max(cur.party, cur.burnt)));
      well.eyesHappy.setAttribute("opacity", f1(cur.party));
      well.eyesX.setAttribute("opacity", f1(cur.burnt));
      well.mouth.setAttribute("d", cur.burnt > 0.5 ? "M-2 -10.4q2-1.6 4 0" : cur.hot > 0.3 ? "M-1.6 -11.2a1.6 1.4 0 1 0 3.2 0a1.6 1.4 0 1 0 -3.2 0" : "M-2 -11q2 1.6 4 0");
      well.mouth.setAttribute("stroke", cur.burnt > 0.5 ? "#fff" : "var(--ink)");
      // water riding up the drop pipe
      const runQ = dead ? 0 : cur.q;
      cur.flowPh = (cur.flowPh + dt * (0.3 + runQ / 900)) % 1;
      well.rising.forEach((n, i) => {
        const p = (cur.flowPh + i / well.rising.length) % 1;
        n.setAttribute("cx", WELL_X);
        n.setAttribute("cy", f1(lerp(intakeY - 26 * PUMP_S, GROUND - 6, p)));
        n.setAttribute("opacity", f1(clamp01(runQ / 300) * (1 - cur.air * 0.7)));
      });
      // sucking air: bubbles boil up from the intake
      well.bubbles.forEach((b) => {
        const p = (t * 0.9 + b.off) % 1, y = lerp(intakeY, Math.max(GROUND, intakeY - 70), p);
        b.node.setAttribute("cx", f1(WELL_X + b.dx * 0.8 + Math.sin(t * 6 + b.off * 9) * 0.8));
        b.node.setAttribute("cy", f1(y));
        b.node.setAttribute("opacity", f1(cur.air * (1 - cur.burnt) * (1 - p) * (still ? 0.8 : 1)));
      });
      // depth tags beside the casing (they step aside for the KA-CHUNK)
      well.tags.setAttribute("opacity", f1(1 - cur.burnt));
      const levelFt = Math.round(cur.dtw + cur.regional + s / cur.k), intakeFt = Math.round(bottomFt - 15);
      const lt = `WATER ${levelFt} FT`, it = `PUMP ${intakeFt} FT`;
      if (well.levelTag.textContent !== lt) well.levelTag.textContent = lt;
      if (well.intakeTag.textContent !== it) well.intakeTag.textContent = it;
      const tagGap = Math.max(10, intakeY - pwl);
      well.levelTag.setAttribute("y", f1(Math.min(pwl + 3, intakeY - tagGap + 3)));
      well.intakeTag.setAttribute("y", f1(Math.max(intakeY + 3, pwl + 13)));
      well.levelLine.setAttribute("y1", f1(pwl)); well.levelLine.setAttribute("y2", f1(pwl));
      well.intakeLine.setAttribute("y1", f1(intakeY)); well.intakeLine.setAttribute("y2", f1(intakeY));

      // ----- layer labels follow their layers; skip one that's too thin to read -----
      const lab = (n, y, show) => { n.setAttribute("y", f1(y)); n.setAttribute("opacity", show ? 1 : 0); };
      lab(labels.dry, (CAL_Y + wt) / 2 + 3, wt - CAL_Y > 14);
      lab(labels.aq, Math.max(wt + 12, Math.min((wt + bottom) / 2 - 2, wt + 40)), true);
      lab(labels.sat, Math.max(wt + 12, Math.min((wt + bottom) / 2 - 2, wt + 40)) + 10, bottom - wt > 24);
      const satTxt = `${Math.round(cur.sat)} FT OF WATER`;
      if (labels.sat.textContent !== satTxt) labels.sat.textContent = satTxt;
      lab(labels.bed, Math.min(H - 6, bottom + 14), H - bottom > 14);

      // ----- surface: gauges, flow in the main, the pivot and its spray -----
      const gpmShown = runQ * (1 - cur.air * 0.5) + (air && !boom && !still ? Math.sin(t * 17) * 80 * cur.air : 0);
      panel.gpm.set(Math.max(0, gpmShown) / 1600, `${Math.round(Math.max(0, runQ) / 10) * 10}`);
      const leftFt = Math.max(0, (intakeY - pwl) / cur.k);
      panel.left.set(leftFt / 100, `${boom ? 0 : Math.round(leftFt)} FT`);
      const lampCls = "iw-lamp " + (boom || air ? (still || Math.sin(t * 10) > 0 ? "bad" : "off") : party ? "ok" : leftFt < 15 && runQ > 0 ? "warn" : runQ > 0 ? "ok" : "off");
      if (panel.lamp.getAttribute("class") !== lampCls) panel.lamp.setAttribute("class", lampCls);
      head.pulse.setAttribute("stroke-dashoffset", f1(-t * (10 + runQ / 20)));
      head.pulse.setAttribute("opacity", f1(clamp01(runQ / 200)));

      cur.wheel = (cur.wheel + dt * 70 * cur.spray) % 360;
      pivot.wheels.forEach((h) => h.setAttribute("transform", `rotate(${f1(cur.wheel)})`));
      const sp = cur.spray * (1 - cur.rain * 0.85);
      pivot.mist.forEach((m) => {
        const p = (t * 1.4 + m.off) % 1, x = m.x + m.dir * p * 8, y = PIPE_Y + NOZZLE + 1 + p * 14 + p * p * 6;
        m.node.setAttribute("cx", f1(x)); m.node.setAttribute("cy", f1(y));
        m.node.setAttribute("opacity", f1(sp * (1 - p) * 0.95));
      });
      pivot.cones.forEach((c, i) => c.setAttribute("opacity", f1(sp * (0.32 + Math.sin(t * 5 + i) * 0.08))));
      const gushK = Math.max(sp * 0.6, cur.party);
      pivot.gush.forEach((m) => {
        const p = (t * 0.9 + m.off) % 1, x = TOWERS[2] + 4 + p * 34, y = PIPE_Y - 5 - 22 * p + 46 * p * p;
        m.node.setAttribute("cx", f1(x)); m.node.setAttribute("cy", f1(y));
        m.node.setAttribute("opacity", f1(gushK * (1 - p * 0.7)));
      });
      field.far.forEach((f, i) => {
        const on = i === 0 ? cur.far2 : cur.far3;
        f.node.setAttribute("opacity", f1(on));
        f.mist.forEach((m, k) => m.setAttribute("cy", f1(120 + ((t * 1.2 + k * 0.3) % 1) * 7)));
        f.mist.forEach((m) => m.setAttribute("opacity", f1(sp)));
      });
      rainbow.setAttribute("opacity", f1(cur.party * 0.95));

      // ----- corn: grows over the season, goes yellow then brown when it's short of water -----
      const hl = clamp01(cur.health);
      const leaf = hl > 0.6 ? mix("#c9b04a", "#4f9a3a", (hl - 0.6) / 0.4) : mix("#8a6a3c", "#c9b04a", hl / 0.6);
      corn.forEach((p) => {
        const sway = still ? 0 : Math.sin(t * 1.6 + p.ph) * (1.5 + cur.rain * 2);
        const droop = (1 - hl) * 9;
        p.node.setAttribute("transform", `translate(${f1(p.x)} ${GROUND}) rotate(${f1(sway + droop * (p.x % 2 ? 1 : -1) * 0.4)}) scale(${(0.8 + cur.grow * 0.2).toFixed(2)} ${(0.3 + cur.grow * 0.7 * p.h).toFixed(2)})`);
        p.stalk.setAttribute("stroke", leaf);
        p.leaves.setAttribute("fill", leaf);
        p.tassel.setAttribute("opacity", f1(clamp01((cur.grow - 0.55) * 4)));
        p.ear.setAttribute("opacity", f1(clamp01((cur.grow - 0.6) * 4) * (0.4 + hl * 0.6)));
      });
      field.band.setAttribute("fill", mix(mix("#b79d63", "#7fae4e", hl), "#6d5a3a", 0));
      field.rows.setAttribute("stroke", leaf);
      field.rows.setAttribute("stroke-opacity", f1(0.35 + cur.grow * 0.5));

      // ----- sky and weather -----
      cur.sunY = approach(cur.sunY, 34 + cur.dark * 20, dt, 2);
      sky.sun.setAttribute("transform", `translate(356 ${f1(cur.sunY)}) scale(${f1(1 + cur.heat * 0.25)})`);
      sky.sun.setAttribute("opacity", f1(1 - cur.dark * 0.75));
      sky.rays.setAttribute("transform", `rotate(${f1((t * 8) % 360)})`);
      sky.clouds.forEach((c) => {
        c.x += (4 + cur.rain * 10) * c.s * dt;
        if (c.x > 420) c.x = -50;
        c.node.setAttribute("transform", `translate(${f1(c.x)} ${c.y}) scale(${f1(c.s * (1 + cur.dark * 0.4))})`);
      });
      sky.shade.setAttribute("opacity", f1(cur.dark * 0.45));
      sky.heat.setAttribute("opacity", f1(cur.heat * 0.24));
      weather.rainG.setAttribute("opacity", f1(cur.rain));
      if (cur.rain > 0.01) weather.rain.forEach((r) => {
        const y = ((t * 1.5 + r.off) % 1) * 150 - 8;
        r.node.setAttribute("transform", `translate(${r.x} ${f1(y)}) rotate(12)`);
      });
      weather.shimmerG.setAttribute("opacity", f1(cur.heat * 0.7));
      if (cur.heat > 0.01) weather.shimmer.forEach((m) => {
        const k = still ? 0 : t * 3 + m.ph;
        m.node.setAttribute("d", `M${m.x} 124q3 ${f1(-3 + Math.sin(k) * 2)} 0 -6t0 -6t0 -6`);
      });

      // ----- catastrophe and celebration -----
      const smokeK = cur.smoke;
      fx.smoke.forEach((m) => {
        const p = (t * 0.32 + m.off) % 1, ps = still ? (m.off * 0.9 + 0.05) : p;
        const baseY = m.top ? GROUND - 18 : intakeY - 14, rise = m.top ? 90 : Math.min(60, intakeY - GROUND - 10);
        const x = (m.top ? WELL_X : WELL_X + 6) + m.dx * (0.5 + ps) * (m.top ? 3 : 1.2) + (m.top ? ps * 14 : 0);
        m.node.setAttribute("cx", f1(x));
        m.node.setAttribute("cy", f1(baseY - ps * rise));
        m.node.setAttribute("r", f1((m.top ? 5 : 3) + ps * (m.top ? 11 : 5)));
        m.node.setAttribute("opacity", f1(smokeK * (1 - ps) * 0.8));
      });
      const sparkOn = boom && (still || cur.deadT < 3.5 || Math.sin(t * 7) > 0.4);
      fx.sparks.setAttribute("opacity", sparkOn ? 1 : 0);
      if (sparkOn) fx.sparkLines.forEach((sl, i) => {
        const p = still ? 0.6 : (t * 3 + i * 0.37) % 1, r0 = 8 + p * 10, r1 = r0 + 4 + p * 3;
        sl.node.setAttribute("x1", f1(WELL_X + Math.cos(sl.a) * r0)); sl.node.setAttribute("y1", f1(intakeY - 8 + Math.sin(sl.a) * r0 * 0.8));
        sl.node.setAttribute("x2", f1(WELL_X + Math.cos(sl.a) * r1)); sl.node.setAttribute("y2", f1(intakeY - 8 + Math.sin(sl.a) * r1 * 0.8));
        sl.node.setAttribute("opacity", f1(1 - p * 0.8));
      });
      // the KA-CHUNK pops in with a bounce beside the pump
      const pop = boom ? (still ? 1 : Math.min(1, (cur.deadT - 0.9) / 0.35)) : 0;
      const popS = pop <= 0 ? 0 : still ? 1 : 1 + Math.sin(pop * Math.PI) * 0.35 + (pop >= 1 ? Math.sin((cur.deadT - 1.25) * 9) * 0.03 * Math.exp(-(cur.deadT - 1.25)) : 0);
      const bangY = Math.max(GROUND + 64, Math.min(intakeY - 56, H - 60));
      fx.bang.setAttribute("opacity", pop > 0 ? 1 : 0);
      fx.bang.setAttribute("transform", `translate(${WELL_X + 140} ${f1(bangY)}) rotate(-8) scale(${(popS * 1.1).toFixed(3)})`);
      fx.steam.setAttribute("opacity", f1(cur.burnt * 0.8));
      fx.steam.setAttribute("transform", `translate(${WELL_X} ${f1(intakeY - 30)})`);
      fx.steamLines.forEach((l, i) => l.setAttribute("transform", `translate(0 ${f1(still ? 0 : -((t * 8 + i * 4) % 10))})`));
      // the pump gives a thumbs up from down the hole
      const th = cur.party, bob = still ? 0 : Math.sin(t * 4) * 1.5;
      fx.thumb.setAttribute("opacity", f1(th));
      fx.thumb.setAttribute("transform", `translate(${WELL_X - 32} ${f1(Math.max(GROUND + 24, intakeY - 34) + bob)}) scale(${f1(-(0.6 + th * 0.4))} ${f1(0.6 + th * 0.4)})`); // on the left, clear of the depth tags
    }

    const anim = loop(svgEl, frame);
    return { set(next) { target = { ...target, ...next }; anim.invalidate(); } };
  }

  root.IrrigationScene = { create };
})(window);
