/* Water Lab, pivot sprinklers: the diagram. lab-pivot.js decides the numbers; this file only draws them.
   A center pivot sweeps a circle of crops in a 3/4 view, with a cut-away of the root zone below.
   Every moving value eases toward its target, so changes glide instead of jumping. */
(function (root) {
  "use strict";
  if (!root.Motion) return;
  const { svg, approach, loop } = root.Motion;

  const C = { x: 200, y: 149 }; // the pivot point
  const ARM = { rx: 176, ry: 42 }; // how far the arm reaches, foreshortened
  const FIELD = { rx: 190, ry: 47 };
  const FRONT = 200; // where the cut-away starts
  const ROOT_FLOOR = 288; // bottom of the root zone
  const SPIN = 0.17; // radians a second the arm sweeps when it's running
  const STILL_ANGLE = 0.42; // where the arm sits when there's no motion
  const scaleAt = (y) => 0.6 + (0.46 * (y - 102)) / 94; // things nearer the viewer draw bigger
  const proj = (a, f) => ({ x: C.x + ARM.rx * f * Math.cos(a), y: C.y + ARM.ry * f * Math.sin(a) });
  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  const f1 = (n) => n.toFixed(1);

  // Each crop drawn at 1:1, base at 0,0. st = stalk (stroke), lf = leaf (fill), hd = seed head (fill), hs = head (stroke)
  const circ = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  const PLANTS = {
    corn: [["st", "M0 0V-17"], ["lf", "M0-3C-4-5-8-6-11-2C-7-4-4-3 0-1ZM0-7C4-9 8-10 11-6C7-8 4-7 0-5ZM0-11C-3-13-6-14-9-11C-6-12-3-11 0-9ZM0-14C3-16 5-16 7-14C5-15 3-14 0-13Z"],
      ["hd", "M1-7c2.2-1 3.2-4 2-6.4-2.2 1-3.2 3.4-2 6.4Z"], ["hs", "M0-17l-2-3M0-17v-4M0-17l2-3"]],
    soybeans: [["st", "M0 0V-6M0-4l-3-3M0-4l3-3"], ["lf", circ(-3.6, -6, 3.1) + circ(3.6, -6, 3.1) + circ(0, -8.6, 3.3) + circ(-2.4, -2.8, 2.5) + circ(2.6, -3, 2.5)],
      ["hd", circ(-1.2, -4.2, 0.9) + circ(1.6, -6.4, 0.9)]],
    wheat: [["st", "M0 0Q-1-6-3-11M0 0V-12M0 0Q1-6 3-11"], ["lf", "M0-1Q-4-4-6-8Q-3-5 0-3ZM0-1Q4-4 6-7Q3-5 0-3Z"],
      ["hd", "M-3-10.5c-1.6-1.2-1.6-4.4 0-5.8 1.6 1.4 1.6 4.6 0 5.8ZM0-11.5c-1.7-1.2-1.7-4.6 0-6.1 1.7 1.5 1.7 4.9 0 6.1ZM3-10.5c-1.6-1.2-1.6-4.4 0-5.8 1.6 1.4 1.6 4.6 0 5.8Z"]],
    alfalfa: [["st", "M0 0V-7M0-3l-4-4M0-3l4-4"], ["lf", circ(-4, -6.5, 2.4) + circ(4, -6.5, 2.4) + circ(0, -8.6, 2.6) + circ(-2, -3.8, 2.2) + circ(2.5, -4.2, 2.2) + circ(-5, -2.6, 1.8) + circ(5, -2.6, 1.8)],
      ["hd", circ(-2, -10.6, 1.2) + circ(2.2, -10, 1.2) + circ(5.2, -8.6, 1) + circ(-5.2, -8.6, 1)]],
    sorghum: [["st", "M0 0V-12"], ["lf", "M0-2C-4-4-8-5-11-1C-7-3-4-2 0 0ZM0-6C4-8 8-9 11-5C7-7 4-6 0-4ZM0-9C-3-11-6-12-8-9C-5-10-3-9 0-7Z"],
      ["hd", "M0-11.5c-3-1-3.6-5-2.2-7.2 1-1.6 3.4-1.6 4.4 0 1.4 2.2.8 6.2-2.2 7.2Z"]]
  };
  const ROOT_DEPTH = { corn: 70, soybeans: 50, wheat: 60, alfalfa: 84, sorghum: 74 };
  const HEAD = { corn: "#a8b851", soybeans: "#7fae4a", wheat: "#a8bf55", alfalfa: "#8e6cc9", sorghum: "#b0582f" };
  const GOLD = { corn: "#e2c04e", soybeans: "#9cc04a", wheat: "#e8c35a", alfalfa: "#a07ad8", sorghum: "#c4612f" };

  // health 0 (burned up) to 1 (lush): brown, straw, yellow-green, green
  const LEAF_STOPS = [[0, "#7b5a34"], [0.3, "#b59a4c"], [0.6, "#93ad45"], [1, "#3f9441"]];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function mix(a, b, k) {
    const A = hex(a), B = hex(b);
    return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * clamp01(k)).toString(16).padStart(2, "0")).join("");
  }
  function leafColor(h) {
    const x = clamp01(h);
    for (let i = 1; i < LEAF_STOPS.length; i++) {
      const [x1, c1] = LEAF_STOPS[i], [x0, c0] = LEAF_STOPS[i - 1];
      if (x <= x1) return mix(c0, c1, (x - x0) / (x1 - x0));
    }
    return LEAF_STOPS.at(-1)[1];
  }

  /** Small seeded random numbers, so the field looks the same on every load. */
  function seeded(seed) {
    let a = seed;
    const next = () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; };
    for (let i = 0; i < 4; i++) next(); // the first few values from a small seed are all tiny, so skip them
    return next;
  }

  /** Rows of plants in perspective, filling the watered circle. Back rows go behind the pivot, front rows in front. */
  function plantField(back, front) {
    const rand = seeded(7), plants = [];
    for (let y = 106; y <= 194; y += 7.4) {
      const k = (y - C.y) / FIELD.ry, half = FIELD.rx * Math.sqrt(Math.max(0, 1 - k * k)) - 6, s = scaleAt(y);
      for (let x = C.x - half + rand() * 6; x <= C.x + half; x += 12.5 * s + rand() * 2.5) {
        if (Math.hypot((x - C.x) / 14, (y - C.y) / 5) < 1) continue; // leave room around the pivot point
        const node = svg("use", { href: "#pvPlant" }, y < C.y ? back : front);
        const weak = rand() < 0.3;
        if (weak) node.setAttribute("class", "weak");
        plants.push({ x, y, s: s * (0.72 + rand() * 0.16), ph: rand() * 6, dir: rand() < 0.5 ? -1 : 1, node });
      }
    }
    return plants;
  }

  /** Branching roots hanging from the front row into the cut-away. */
  function rootsPath(depth) {
    const rand = seeded(11);
    let d = "";
    for (let x = 14; x < 400; x += 22) {
      const len = depth * (0.8 + rand() * 0.3);
      d += `M${x} ${FRONT}q${f1(rand() * 6 - 3)} ${f1(len / 2)} ${f1(rand() * 4 - 2)} ${f1(len)}`;
      for (let b = 1; b <= 3; b++) {
        const y = FRONT + (len * b) / 4, side = b % 2 ? -1 : 1;
        d += `M${x} ${f1(y)}q${side * 5} ${f1(len * 0.12)} ${side * 9} ${f1(len * 0.25)}`;
      }
    }
    return d;
  }

  /** Dry-ground cracks across the field. */
  function cracksPath() {
    const rand = seeded(23);
    let d = "";
    for (let i = 0; i < 26; i++) {
      let x = 20 + rand() * 360, y = 110 + rand() * 82;
      d += `M${f1(x)} ${f1(y)}`;
      for (let j = 0; j < 4; j++) { x += rand() * 16 - 8; y += rand() * 5 - 2.5; d += `L${f1(x)} ${f1(y)}`; }
    }
    return d;
  }

  /** The farmstead on the horizon: grain bins, a leg and a red barn. */
  function buildFarm(g) {
    svg("path", { d: "M300 104V84l3-4h12l3 4v20ZM320 104V88l2.5-3h9l2.5 3v16ZM338 104V74h6v30Z", class: "pv-bin" }, g);
    svg("path", { d: "M300 88h18M300 94h18M320 92h14M320 98h14", class: "pv-bin-line" }, g);
    svg("path", { d: "M352 104V92l9-7 9 7v12Z", class: "pv-barn" }, g);
    svg("path", { d: "M358 104v-6h6v6", class: "pv-bin-line" }, g);
    svg("path", { d: "M30 104q4-14 12-14t10 14ZM46 104q5-18 14-18t12 18Z", class: "pv-tree" }, g);
  }

  function buildSun(g) {
    const rays = svg("g", {}, g);
    for (let i = 0; i < 10; i++) svg("line", { x1: 0, y1: -15, x2: 0, y2: -20, transform: `rotate(${i * 36})` }, rays);
    svg("circle", { r: 11 }, g);
    const glasses = svg("g", { class: "pv-shades", opacity: 0 }, g);
    svg("path", { d: "M-9-3h7.5l-1 4.5a3 3 0 0 1-5.5 0ZM1.5-3H9l-1 4.5a3 3 0 0 1-5.5 0Z" }, glasses);
    svg("path", { d: "M-2-2.4h3.5M-11-3.4h22", class: "pv-shades-bar" }, glasses);
    svg("path", { d: "M-4 5q4 3 8 0", class: "pv-smile" }, glasses);
    return { rays, glasses };
  }

  /** The center tower over the well: four legs, the riser pipe and the control panel. */
  function buildHub(g) {
    const x = C.x, y = C.y, top = y - 38;
    svg("ellipse", { cx: x, cy: y + 2, rx: 14, ry: 3.4, class: "pv-pad" }, g);
    svg("path", { d: `M${x - 12} ${y + 3}L${x} ${top}L${x + 12} ${y + 3}M${x - 6} ${y - 3}L${x} ${top}L${x + 6} ${y - 3}M${x - 9} ${y - 8}H${x + 9}M${x - 5} ${y - 22}H${x + 5}`, class: "pv-leg" }, g);
    svg("rect", { x: x - 2.4, y: top - 3, width: 4.8, height: 44, class: "pv-pipe-fill" }, g);
    svg("rect", { x: x + 5, y: y - 18, width: 9, height: 11, rx: 1, class: "pv-panel" }, g);
    svg("circle", { cx: x + 9.5, cy: y - 14.5, r: 1.4, class: "pv-led" }, g);
    svg("path", { d: `M${x - 3} ${top - 3}h6`, class: "pv-leg" }, g);
  }

  /** A cartoon combine: header with a turning reel, cab, grain tank and big tires. Faces right. */
  function buildCombine(g) {
    const body = svg("g", {}, g);
    svg("path", { d: "M-22 -4h30v-12h-8l-3-7h-12v7h-7Z", class: "pv-combine" }, body);
    svg("path", { d: "M-15-23h10l2 7h-12Z", class: "pv-cab" }, body);
    svg("path", { d: "M-26-18h14v-8h-14Z", class: "pv-combine" }, body); // grain tank
    svg("path", { d: "M-24-26q-10-6-14-2", class: "pv-auger" }, body);
    svg("path", { d: "M8-8h4l2-3h14l2 11H8Z", class: "pv-header" }, body);
    svg("path", { d: "M14-2h14M15 1h13", class: "pv-reel" }, body);
    const reel = svg("g", { transform: "translate(21 -12)" }, body);
    svg("circle", { r: 5, class: "pv-reel" }, reel);
    svg("path", { d: "M-5 0H5M0-5V5M-3.5-3.5l7 7M3.5-3.5l-7 7", class: "pv-reel" }, reel);
    svg("circle", { cx: -4, cy: -2, r: 6.5, class: "pv-tire" }, body);
    svg("circle", { cx: -4, cy: -2, r: 2.4, class: "pv-hub" }, body);
    svg("circle", { cx: -19, cy: 0, r: 4, class: "pv-tire" }, body);
    svg("circle", { cx: -19, cy: 0, r: 1.5, class: "pv-hub" }, body);
    return { body, reel };
  }

  /** A tumbleweed: a tangle of loops. */
  function buildTumbleweed(g) {
    const rand = seeded(5);
    let d = "";
    for (let i = 0; i < 9; i++) {
      const a = rand() * 6.3, r = 4 + rand() * 6;
      d += `M${f1(Math.cos(a) * r)} ${f1(Math.sin(a) * r)}a${f1(r)} ${f1(r * 0.7)} ${Math.round(rand() * 180)} 1 1 ${f1(rand() * 4 - 2)} ${f1(rand() * 4 - 2)}`;
    }
    svg("circle", { r: 10, class: "pv-weed-fill" }, g);
    svg("path", { d, class: "pv-weed" }, g);
  }

  const GRASSHOPPER = "M-4 0c0-2 3-3 7-2l3 1-3 1.5C1 1-4 1.6-4 0ZM0-1l3-4 2 5M5 0.5l2 2M-2 1l-1 2";

  function create(svgEl) {
    if (!svgEl) return { set() {} };
    const $ = (id) => svgEl.querySelector("#" + id);
    const el = Object.fromEntries(["pvPlant", "pvSun", "pvClouds", "pvShade", "pvHeat", "pvBolt", "pvFarm", "pvGround", "pvWetPass", "pvCracks",
      "pvRuts", "pvBack", "pvRig", "pvFront", "pvParty", "pvWet", "pvPores", "pvRoots", "pvLift", "pvMoist", "pvGpmTag", "pvWind",
      "pvRain", "pvDustSky", "pvDoom"].map((id) => [id, $(id)]));

    buildFarm(el.pvFarm);
    const sun = buildSun(el.pvSun);
    const clouds = [{ x: 40, y: 20, s: 1 }, { x: 230, y: 12, s: 0.75 }, { x: 140, y: 44, s: 0.6 }].map((c) =>
      ({ ...c, node: svg("path", { d: "M0 10a7 7 0 0 1 7-7 9 9 0 0 1 16-3 7 7 0 0 1 11 4 6 6 0 0 1 2 12H3a5 5 0 0 1-3-6z" }, el.pvClouds) }));
    const storm = svg("g", { class: "pv-stormcloud", opacity: 0 }, el.pvClouds);
    [[30, 4, 1.8], [150, -2, 2.2], [280, 6, 1.9]].forEach(([x, y, s]) =>
      svg("path", { d: "M0 10a7 7 0 0 1 7-7 9 9 0 0 1 16-3 7 7 0 0 1 11 4 6 6 0 0 1 2 12H3a5 5 0 0 1-3-6z", transform: `translate(${x} ${y}) scale(${s})` }, storm));

    // field: wheel tracks, cracks, crops either side of the pivot
    el.pvCracks.setAttribute("d", cracksPath());
    const hub = svg("g", { class: "pv-hub-g" });
    el.pvRig.parentNode.insertBefore(hub, el.pvRig);
    buildHub(hub);
    const plants = plantField(el.pvBack, el.pvFront);

    // the moving arm: one path each for pipe, truss and legs, plus wheels, drop hoses, spray and the end gun
    const truss = svg("path", { class: "pv-truss" }, el.pvRig);
    const legs = svg("path", { class: "pv-leg" }, el.pvRig);
    const pipeEdge = svg("path", { class: "pv-pipe-edge" }, el.pvRig);
    const pipe = svg("path", { class: "pv-pipe" }, el.pvRig);
    const hoses = svg("path", { class: "pv-hose" }, el.pvRig);
    const cones = svg("path", { class: "pv-cone" }, el.pvRig);
    const gun = svg("path", { class: "pv-gun" }, el.pvRig);
    const wheelG = svg("g", { class: "pv-wheels" }, el.pvRig);
    const spray = Array.from({ length: 56 }, (_, i) => ({ k: (i * 0.618) % 1, off: (i * 0.37) % 1, side: i % 2 ? 1 : -1, node: svg("circle", { r: 1.1, class: "pv-drop" }, el.pvRig) }));
    const alert = svg("g", { class: "pv-alert", opacity: 0 }, el.pvRig);
    svg("path", { d: "M0-9 8 5H-8Z" }, alert);
    svg("path", { d: "M0-4v4.5M0 2.6v.2", class: "pv-alert-mark" }, alert);
    let wheels = [], spans = 0;
    const rebuildWheels = (n) => {
      wheelG.replaceChildren();
      wheels = Array.from({ length: n * 2 }, () => svg("circle", { class: "pv-tire" }, wheelG));
      el.pvRuts.replaceChildren();
      for (let i = 1; i <= n; i++) svg("ellipse", { cx: C.x, cy: C.y, rx: f1((ARM.rx * i) / n), ry: f1((ARM.ry * i) / n) }, el.pvRuts);
      spans = n;
    };

    // cut-away: wet soil, water specks, roots
    const pick = seeded(31); // fixed scatter for the soil specks and the grasshoppers
    const pores = Array.from({ length: 36 }, () => {
      const y = FRONT + 6 + pick() * (ROOT_FLOOR - FRONT - 8);
      return { y, node: svg("circle", { cx: f1(8 + pick() * 384), cy: f1(y), r: f1(0.9 + pick() * 0.9) }, el.pvPores) };
    });

    // weather
    const rain = Array.from({ length: 34 }, (_, i) => ({ x: (i * 47) % 400, off: (i * 0.37) % 1, node: svg("line", { y1: 0, y2: 7 }, el.pvRain) }));
    const gusts = Array.from({ length: 9 }, (_, i) => ({ y: 18 + ((i * 37) % 170), off: (i * 0.29) % 1, len: 18 + (i % 3) * 10, node: svg("path", {}, el.pvWind) }));

    // endings: the combine and the disaster
    const combine = buildCombine(svg("g", { class: "pv-combine-g", opacity: 0 }, el.pvParty));
    const doom = svg("g", { opacity: 0 }, el.pvDoom);
    const dust = Array.from({ length: 46 }, (_, i) => ({ y: 30 + ((i * 53) % 175), off: (i * 0.137) % 1, r: 1.5 + (i % 4), node: svg("circle", { class: "pv-dust" }, doom) }));
    const weed = svg("g", {}, doom);
    buildTumbleweed(weed);
    const hoppers = Array.from({ length: 16 }, () => {
      return { x: 30 + pick() * 340, y: 118 + pick() * 76, ph: pick() * 3, dir: pick() < 0.5 ? -1 : 1, node: svg("path", { d: GRASSHOPPER, class: "pv-hopper" }, doom) };
    });

    let crop = "";
    let target = { crop: "corn", acres: 125, gpm: 800, flow: 0.7, health: 1, moisture: 0.8, weather: "clear", ending: "", day: 0 };
    const cur = { angle: STILL_ANGLE, spin: SPIN, flow: 0, health: 1, grow: 1, moisture: 0.8, collapse: 0, party: 0, doom: 0, combine: 0,
      dark: 0, rain: 0, heat: 0, wind: 0, broke: 0, roots: 0.5, front: null };

    function setCrop(next) {
      el.pvPlant.replaceChildren();
      PLANTS[next].forEach(([cls, d]) => svg("path", { d, class: "pv-" + cls }, el.pvPlant));
      el.pvRoots.setAttribute("d", rootsPath(ROOT_DEPTH[next]));
      crop = next;
    }

    /** Where everything on the arm sits for this angle. */
    function drawRig(t, still) {
      const a = cur.angle, n = spans;
      const pts = [{ x: C.x, y: C.y, s: scaleAt(C.y), top: C.y - 38 }];
      for (let i = 1; i <= n; i++) {
        const g = proj(a, i / n), s = scaleAt(g.y);
        pts.push({ ...g, s, top: g.y - 30 * s });
      }
      const end = pts[n], over = proj(a, 1.06), os = scaleAt(over.y), overTop = over.y - 27 * os;
      const along = { x: Math.cos(a), y: Math.sin(a) * (ARM.ry / ARM.rx) };
      const side = { x: -Math.sin(a) * 6, y: Math.cos(a) * 1.6 };

      let dPipe = `M${C.x} ${pts[0].top}`, dTruss = "", dLegs = "", dHoses = "", dCones = "";
      const nozzles = [];
      for (let i = 1; i <= n; i++) {
        const p = pts[i - 1], q = pts[i], s = (p.s + q.s) / 2;
        const mx = (p.x + q.x) / 2, mTop = (p.top + q.top) / 2;
        dPipe += `Q${f1(mx)} ${f1(mTop - 3 * s)} ${f1(q.x)} ${f1(q.top)}`;
        const low = mTop + 9 * s; // the truss rods hang below the pipe in a shallow V
        dTruss += `M${f1(p.x)} ${f1(p.top)}Q${f1(mx)} ${f1(low + 4 * s)} ${f1(q.x)} ${f1(q.top)}`;
        for (let k = 1; k < 6; k++) {
          const u = k / 6, x = p.x + (q.x - p.x) * u, yTop = p.top + (q.top - p.top) * u - 3 * s * 4 * u * (1 - u);
          const yLow = (1 - u) * (1 - u) * p.top + 2 * u * (1 - u) * (low + 4 * s) + u * u * q.top;
          dTruss += `M${f1(x)} ${f1(yTop)}L${f1(x + (k % 2 ? 1 : -1) * 3 * s)} ${f1(yLow)}`;
        }
        for (const u of [0.2, 0.45, 0.7, 0.92]) {
          const x = p.x + (q.x - p.x) * u, gy = p.y + (q.y - p.y) * u, sc = scaleAt(gy);
          const yTop = p.top + (q.top - p.top) * u - 3 * s * 4 * u * (1 - u), yN = gy - 13 * sc;
          dHoses += `M${f1(x)} ${f1(yTop)}V${f1(yN)}`;
          dCones += `M${f1(x)} ${f1(yN)}L${f1(x - 6 * sc)} ${f1(gy - 1)}Q${f1(x)} ${f1(gy + 1.5 * sc)} ${f1(x + 6 * sc)} ${f1(gy - 1)}Z`;
          nozzles.push({ x, y: yN, g: gy, s: sc });
        }
        dLegs += `M${f1(q.x)} ${f1(q.top)}L${f1(q.x + side.x * q.s)} ${f1(q.y + side.y)}M${f1(q.x)} ${f1(q.top)}L${f1(q.x - side.x * q.s)} ${f1(q.y - side.y)}`;
        dLegs += `M${f1(q.x + side.x * q.s * 0.6)} ${f1(q.y - 11 * q.s)}H${f1(q.x - side.x * q.s * 0.6)}`;
        wheels[(i - 1) * 2].setAttribute("cx", f1(q.x + side.x * q.s));
        wheels[(i - 1) * 2].setAttribute("cy", f1(q.y + side.y - 1.6 * q.s));
        wheels[(i - 1) * 2 + 1].setAttribute("cx", f1(q.x - side.x * q.s));
        wheels[(i - 1) * 2 + 1].setAttribute("cy", f1(q.y - side.y - 1.6 * q.s));
        wheels[(i - 1) * 2].setAttribute("r", f1(2.6 * q.s));
        wheels[(i - 1) * 2 + 1].setAttribute("r", f1(2.6 * q.s));
      }
      dPipe += `L${f1(over.x)} ${f1(overTop)}`;
      dTruss += `M${f1(end.x)} ${f1(end.top - 6 * end.s)}L${f1(over.x)} ${f1(overTop)}`; // overhang cable
      pipe.setAttribute("d", dPipe);
      pipeEdge.setAttribute("d", dPipe);
      truss.setAttribute("d", dTruss);
      legs.setAttribute("d", dLegs);
      hoses.setAttribute("d", dHoses);
      cones.setAttribute("d", dCones);
      cones.setAttribute("opacity", (cur.flow * (0.62 + (still ? 0 : Math.sin(t * 9) * 0.08))).toFixed(2));

      // the end gun throws an arc of water past the end of the arm
      const reach = 30 * os, gx = over.x + along.x * reach, gy = over.y + along.y * reach;
      gun.setAttribute("d", `M${f1(over.x)} ${f1(overTop)}Q${f1(over.x + along.x * reach * 0.5)} ${f1(overTop - 14 * os)} ${f1(gx)} ${f1(gy)}`);
      gun.setAttribute("opacity", f1(cur.flow));
      gun.setAttribute("stroke-dashoffset", still ? 0 : f1((-t * 40) % 100));

      spray.forEach((d) => {
        const nz = nozzles[Math.floor(d.k * nozzles.length)], p = still ? d.off : (t * 1.8 + d.off) % 1;
        d.node.setAttribute("cx", f1(nz.x + d.side * p * 6 * nz.s));
        d.node.setAttribute("cy", f1(nz.y + (nz.g - nz.y) * p * p + 1));
        d.node.setAttribute("opacity", f1(cur.flow * (1 - p * 0.6)));
      });

      // a warning sign when the pivot's stuck
      const mid = pts[Math.max(1, n - 1)];
      alert.setAttribute("transform", `translate(${f1(mid.x)} ${f1(mid.top - 12 * mid.s)}) scale(${f1(mid.s)})`);
      alert.setAttribute("opacity", f1(cur.broke * (still || Math.sin(t * 8) > -0.3 ? 1 : 0.35)));

      // the arm passes in front of the pivot point for half its turn
      const front = Math.sin(a) > 0;
      if (front !== cur.front) {
        el.pvRig.parentNode.insertBefore(el.pvRig, front ? el.pvParty : hub);
        cur.front = front;
      }

      // freshly watered soil trails behind the arm
      let wet = `M${C.x} ${C.y}`;
      for (let k = 0; k <= 8; k++) { const p = proj(a - (k / 8) * 0.9, 1.1); wet += `L${f1(p.x)} ${f1(p.y)}`; }
      el.pvWetPass.setAttribute("d", wet + "Z");
      el.pvWetPass.setAttribute("opacity", f1(cur.flow * 0.45));
    }

    function drawCrops(t, still) {
      const h = cur.health, sway = still ? 0 : 1, gust = cur.wind;
      const base = leafColor(h), weak = leafColor(h - 0.18);
      const party = cur.party;
      const style = el.pvBack.parentNode.style;
      style.setProperty("--pv-leaf", party > 0.01 ? mix(base, "#5fae3a", party * 0.5) : base);
      style.setProperty("--pv-leaf-weak", weak);
      style.setProperty("--pv-stem", mix(base, "#3b2a17", 0.25));
      style.setProperty("--pv-head", mix(mix(leafColor(h), HEAD[crop], h), GOLD[crop], party));
      const grow = cur.grow, droop = (1 - h) * 18, fall = cur.collapse;
      plants.forEach((p) => {
        const wave = Math.sin(t * (1.4 + gust * 1.2) + p.x * 0.045 + p.ph) * (1.5 + gust * 6 + party * 5) * sway + gust * 10;
        const lean = wave + p.dir * (droop + fall * 62);
        const sy = p.s * grow * (1 - fall * 0.55), sx = p.s * (1 + fall * 0.1);
        p.node.setAttribute("transform", `translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(lean)}) scale(${sx.toFixed(2)} ${sy.toFixed(2)})`);
      });
    }

    function drawGround(t, still) {
      const m = cur.moisture;
      el.pvGround.style.fill = `color-mix(in srgb, #4a3220 ${Math.round(18 + m * 50)}%, var(--soil-1))`;
      el.pvCracks.setAttribute("opacity", f1(Math.max(clamp01((0.32 - m) / 0.28), cur.doom)));
      // the wet soil in the cut-away rises and falls with what's in the root zone
      const top = ROOT_FLOOR - (ROOT_FLOOR - FRONT - 4) * m;
      let d = `M0 ${ROOT_FLOOR}V${f1(top)}`;
      for (let x = 0; x <= 400; x += 10) d += `L${x} ${f1(top + Math.sin(x * 0.07 + (still ? 0 : t * 1.2)) * 1.6)}`;
      el.pvWet.setAttribute("d", d + `L400 ${ROOT_FLOOR}Z`);
      pores.forEach((p) => p.node.setAttribute("opacity", p.y > top + 2 ? 0.8 : 0.12));
      el.pvRoots.setAttribute("transform", `translate(0 ${FRONT}) scale(1 ${cur.roots.toFixed(2)}) translate(0 ${-FRONT})`);
      el.pvRoots.style.stroke = mix("#8b6b3d", "#efe3c4", cur.health);
      const label = `SOIL WATER ${Math.round(target.moisture * 100)}%`;
      if (el.pvMoist.textContent !== label) el.pvMoist.textContent = label;
      const tag = `${target.gpm.toLocaleString("en-US")} GPM`;
      if (el.pvGpmTag.textContent !== tag) el.pvGpmTag.textContent = tag;
      el.pvLift.setAttribute("opacity", f1(cur.flow));
      el.pvLift.setAttribute("stroke-dashoffset", still ? 0 : f1((t * 30) % 60));
    }

    function drawSky(t, still, dt) {
      el.pvShade.setAttribute("opacity", f1(cur.dark * 0.45));
      el.pvHeat.setAttribute("opacity", f1(cur.heat * (0.26 + (still ? 0 : Math.sin(t * 2) * 0.04))));
      const flash = !still && cur.rain > 0.8 && t % 3.3 < 0.13 ? 1 : 0; // now and then a lightning bolt
      el.pvBolt.setAttribute("opacity", flash);
      el.pvRain.setAttribute("opacity", f1(cur.rain));
      if (cur.rain > 0.01) rain.forEach((r) => {
        const y = ((still ? r.off : t * 1.7 + r.off) % 1) * 200 - 8;
        r.node.setAttribute("transform", `translate(${r.x} ${f1(y)}) rotate(14)`);
      });
      el.pvSun.setAttribute("transform", `translate(345 ${f1(30 - cur.heat * 4)}) scale(${(1 + cur.heat * 0.3).toFixed(2)})`);
      el.pvSun.setAttribute("opacity", f1(1 - cur.dark * 0.85));
      el.pvSun.classList.toggle("hot", cur.heat > 0.5);
      sun.rays.setAttribute("transform", `rotate(${still ? 0 : f1((t * 10) % 360)})`);
      sun.glasses.setAttribute("opacity", f1(cur.party));
      clouds.forEach((c) => {
        if (!still) c.x += (3 + cur.wind * 30) * c.s * dt;
        if (c.x > 420) c.x = -50;
        c.node.setAttribute("transform", `translate(${f1(c.x)} ${c.y}) scale(${c.s})`);
        c.node.setAttribute("opacity", f1(1 - cur.doom * 0.8));
      });
      el.pvClouds.lastChild.setAttribute("opacity", f1(cur.rain));
      el.pvWind.setAttribute("opacity", f1(Math.max(cur.wind, cur.doom) * 0.9));
      if (cur.wind > 0.01 || cur.doom > 0.01) gusts.forEach((gu) => {
        const x = ((still ? gu.off : t * 0.9 + gu.off) % 1) * 520 - 60;
        gu.node.setAttribute("d", `M${f1(x)} ${gu.y}q${gu.len / 2} -3 ${gu.len} 0t${gu.len} 0`);
      });
    }

    function drawEndings(t, still) {
      // celebration: a combine rolls along the front row
      const cg = combine.body.parentNode;
      cg.setAttribute("opacity", f1(cur.combine));
      if (cur.combine > 0.01) {
        const x = still ? 140 : ((t * 22) % 520) - 50, bob = still ? 0 : Math.sin(t * 9) * 0.4;
        cg.setAttribute("transform", `translate(${f1(x)} ${f1(190 + bob)}) scale(1.1)`);
        combine.reel.setAttribute("transform", `translate(21 -12) rotate(${still ? 0 : f1((t * 200) % 360)})`);
      }
      // catastrophe: dust storm, a tumbleweed, and a swarm of grasshoppers
      el.pvDustSky.setAttribute("opacity", f1(cur.doom * 0.55));
      el.pvDoom.firstChild.setAttribute("opacity", f1(cur.doom));
      if (cur.doom < 0.01) return;
      dust.forEach((p) => {
        const k = still ? p.off : (t * 0.35 + p.off) % 1;
        p.node.setAttribute("cx", f1(k * 440 - 20));
        p.node.setAttribute("cy", f1(p.y + Math.sin(k * 12 + p.off * 9) * 8));
        p.node.setAttribute("r", p.r);
      });
      const wx = still ? 250 : ((t * 55) % 560) - 70, hop = still ? 0 : Math.abs(Math.sin(t * 4)) * 14;
      weed.setAttribute("transform", `translate(${f1(wx)} ${f1(188 - hop)}) rotate(${f1(wx * 4)}) scale(1.1)`);
      hoppers.forEach((g, i) => {
        const p = still ? 0.5 : (t * 0.9 + g.ph) % 1, arc = Math.sin(p * Math.PI) * 16;
        const x = g.x + (still ? 0 : (((t * 0.9 + g.ph) | 0) * 23 * g.dir) % 120) + p * 20 * g.dir;
        const wrap = ((x % 400) + 400) % 400;
        g.node.setAttribute("transform", `translate(${f1(wrap)} ${f1(g.y - arc - (i % 3) * 18)}) scale(${(g.dir * 1.3).toFixed(1)} 1.3)`);
      });
    }

    function frame(dt, t, still) {
      const T = target, W = T.weather, end = T.ending;
      if (T.crop !== crop) setCrop(T.crop);
      const n = Math.max(4, Math.min(8, Math.round(Math.sqrt((T.acres * 43560) / Math.PI) / 190)));
      if (n !== spans) rebuildWheels(n);

      const lost = end === "lost", party = end === "thrived" || end === "tight";
      const health = lost ? 0 : end === "thrived" ? 1 : end === "tight" ? Math.max(0.7, T.health) : end === "thirsty" ? Math.min(0.5, T.health) : T.health;
      cur.flow = approach(cur.flow, W === "broke" || lost ? 0 : clamp01(T.flow), dt, 3);
      cur.broke = approach(cur.broke, W === "broke" ? 1 : 0, dt, 5);
      cur.spin = approach(cur.spin, W === "broke" || lost ? 0 : SPIN, dt, 2);
      cur.angle = still ? STILL_ANGLE : (cur.angle + cur.spin * dt) % (Math.PI * 2);
      cur.health = approach(cur.health, health, dt, 2.2);
      cur.grow = approach(cur.grow, party ? 1.15 : 0.62 + 0.38 * health, dt, 1.6);
      cur.moisture = approach(cur.moisture, lost ? 0 : T.moisture, dt, 2.5);
      cur.roots = approach(cur.roots, 0.45 + 0.55 * health, dt, 1.5);
      cur.collapse = approach(cur.collapse, lost ? 1 : 0, dt, 1.4);
      cur.party = approach(cur.party, party ? 1 : 0, dt, 2);
      cur.combine = approach(cur.combine, end === "thrived" ? 1 : 0, dt, 2);
      cur.doom = approach(cur.doom, lost ? 1 : 0, dt, 1.6);
      cur.dark = approach(cur.dark, W === "storm" ? 1 : 0, dt, 2);
      cur.rain = approach(cur.rain, W === "storm" ? 1 : 0, dt, 2);
      cur.heat = approach(cur.heat, W === "heat" || lost ? 1 : 0, dt, 2);
      cur.wind = approach(cur.wind, W === "windy" ? 1 : lost ? 0.6 : 0, dt, 2);

      drawSky(t, still, dt);
      drawGround(t, still);
      drawRig(t, still);
      drawCrops(t, still);
      drawEndings(t, still);
    }

    const anim = loop(svgEl, frame);
    return { set(next) { target = { ...target, ...next }; anim.invalidate(); } };
  }

  root.PivotScene = { create };
})(window);
