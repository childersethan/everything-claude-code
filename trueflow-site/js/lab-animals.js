/* Water Lab livestock: cattle, goats and chickens, and how they go if the water runs out.
   Cartoon only: they stagger, see stars, flop over legs-up and float off with a halo.
   Each animal is drawn standing on (0, 0) facing right; lab-scene.js places and scales it. */
(function (root) {
  "use strict";
  const { svg, approach } = root.Motion;

  const LINE = { stroke: "var(--ink)", "stroke-linecap": "round", "stroke-linejoin": "round" };
  const OUTLINE = { ...LINE, "stroke-width": 0.7 };
  const STAR = "M0-2l.6 1.4L2-.6.6.2 0 2-.6.2-2-.6-.6-1.4z";
  const WINGS = "M-1-21c-4-4-9-3-10 0 3 0 6 1 10 2zM1-21c4-4 9-3 10 0-3 0-6 1-10 2z";

  // `fur` and `patch` parts go brown when an animal shrivels in the heat, and black when lightning hits it
  const SPECIES = {
    cattle: {
      scale: 1, headAt: [11, -18], tailAt: [-15, -18], nod: 38, starsY: -27,
      legs: [-11, -7, 5, 9], legTop: -8, legW: 2.6, legInk: "var(--ink)",
      body: "M-15-15c0-4 3-6 7-6h13c4 0 7 3 7 7v3c0 3-2 5-5 5h-17c-3 0-5-2-5-5z",
      art(b, h, tail) {
        svg("path", { d: this.body, class: "fur dark" }, b);
        svg("path", { d: "M-9-21c2 2 1 5-2 6s-4-2-3-4c1-1 3-2 5-2zM2-20c2 0 4 2 3 4s-4 2-5 0 0-4 2-4zM-15-13c2 0 3 2 2 3-1 1-2 0-2-1z", class: "patch" }, b);
        svg("path", { d: "M-2-6c0 2 1 3 2.5 3S3-4 3-6z", class: "pink" }, b);
        svg("path", { d: "M-1-2c1-2 4-3 6-2l3 4c1 2 1 4-1 5l-3 1c-2 0-3-1-4-3z", class: "fur dark" }, h);
        svg("path", { d: "M4 3.5c1.5-.8 3.2-.3 3.6 1 .3 1.2-.6 2.2-2 2.2-1.2 0-2-.6-2.2-1.6z", class: "pink" }, h);
        svg("path", { d: "M-1-1l-4 .5c-1 .2-1 1.4 0 1.6l4 .3z", class: "fur dark" }, h);
        svg("path", { d: "M1-3c0-2 1-3 3-3.5", fill: "none", stroke: "#efe6cf", "stroke-width": 1.2, "stroke-linecap": "round" }, h);
        svg("path", { d: "M0 0c-2 3-3 7-2 11", fill: "none", ...LINE, "stroke-width": 1.2, class: "limb" }, tail);
        svg("ellipse", { cx: -2, cy: 11.5, rx: 1.3, ry: 2, class: "fur dark" }, tail);
      },
      eye: [3, 0.5], eyeInk: "#fff", headGhost: [14, -16, 4]
    },
    goats: {
      scale: 0.9, headAt: [8, -19], tailAt: [-11, -17], nod: 45, starsY: -29,
      legs: [-8, -5, 4, 7], legTop: -8, legW: 1.8, legInk: "#5b5245",
      body: "M-11-15c0-3 2-5 5-5h10c3 0 5 2 5 5v3c0 3-2 5-4 5h-12c-2 0-4-2-4-5z",
      art(b, h, tail) {
        svg("path", { d: this.body, class: "fur light", ...OUTLINE }, b);
        svg("path", { d: "M-7-19c3-1 5 1 4 4-1 2-4 2-5 1-1-2-1-4 1-5z", class: "patch tan" }, b);
        svg("path", { d: "M-2 3c0-3 1-6 3-7 2-1 4 0 5 2l2 4c.5 1.5-.4 2.5-1.8 2.5H5l-2 3H0z", class: "fur light", ...OUTLINE }, h);
        svg("path", { d: "M0-1c-2 0-4 1-4 2.5 1 .5 3 0 4-1z", class: "fur light", ...OUTLINE }, h);
        svg("path", { d: "M1-3.5c-1-3-3-4.5-6-4M5.5 4.5c0 1.5-.5 3-1.2 3.6", fill: "none", stroke: "#8c7b5e", "stroke-width": 1.3, "stroke-linecap": "round" }, h);
        svg("path", { d: "M0 0c-1-2-1-4 0-5", fill: "none", stroke: "#5b5245", "stroke-width": 1.8, "stroke-linecap": "round", class: "limb" }, tail);
      },
      eye: [3.6, -1], eyeInk: "var(--ink)", headGhost: [11, -19, 3.5]
    },
    chickens: {
      scale: 0.8, headAt: [5, -16], tailAt: [-7, -12], nod: 70, starsY: -24,
      legs: [-2, 2], legTop: -4, legW: 1.2, legInk: "#e09a2b",
      body: "M-8-10c0-4 3-7 8-7 3 0 5 1 6 3l1 4c0 4-3 7-7.5 7S-8-6-8-10z",
      art(b, h, tail) {
        svg("path", { d: "M-4 0h3.5M0 0h4", fill: "none", stroke: "#e09a2b", "stroke-width": 1, "stroke-linecap": "round" }, b);
        svg("path", { d: this.body, class: "fur light", ...OUTLINE }, b);
        svg("path", { d: "M-4-11c3-2 7-1 8 2-2 3-6 3-8 0z", class: "patch wing", ...OUTLINE, "stroke-width": 0.6 }, b);
        svg("circle", { r: 3.4, class: "fur light", ...OUTLINE }, h);
        svg("path", { d: "M-2-2.8c-.2-1.8 1.2-2.6 2-1.3.4-1.7 2.2-1.6 2.2.1 1-.8 2.2.1 1.4 1.4z", fill: "var(--brand)" }, h);
        svg("path", { d: "M3.2-.8l3 1.1-3 1.3z", fill: "#f0a830" }, h);
        svg("path", { d: "M2.6 1.6c.8 1.4.1 2.8-1 2-.4-.7 0-1.6 1-2z", fill: "var(--brand)" }, h);
        svg("path", { d: "M0 0c-3-1-5-5-4-9 2 2 3 3 4 4 0-3 1-5 3-6 0 3 0 7-1 10z", class: "fur light", ...OUTLINE }, tail);
      },
      eye: [1.3, -0.6], eyeInk: "var(--ink)", headGhost: [5, -16, 3.4]
    }
  };

  const ease = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p));
  const span = (t, a, b) => ease((t - a) / (b - a));
  function bounce(p) { // lands, bounces twice, settles
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    const n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  }

  /**
   * The death scene, `t` seconds in. Thirst: staggers, sees stars, knees buckle, flops legs-up.
   * Heat: steams, shrivels and goes brown first. Storm: struck by lightning and blown off the map.
   */
  function fate(death, t) {
    const f = { wobble: 0, flip: 0, lift: 0, dx: 0, spin: 0, fade: 1, sx: 1, sy: 1, parched: false, charred: false,
      stars: 0, steam: 0, zap: 0, dust: -1, shake: 0, dead: false, ghost: 0, rise: 0 };
    if (t <= 0) return f;
    if (death === "blown") {
      const fly = Math.max(0, t - 0.4), p = span(fly, 0, 2.6);
      return { ...f, zap: t < 0.4 ? 1 : 0, charred: t > 0.1 && t < 1.2, dead: t > 0.2, shake: t < 0.4 ? 2.5 : 0,
        lift: Math.sin(Math.min(1, fly / 2.6) * Math.PI) * 50 + p * 30, dx: p * 240, spin: fly * 300, fade: 1 - span(fly, 2, 2.6) };
    }
    const heat = death === "heat";
    const fallAt = heat ? 2.4 : 1.6, impact = fallAt + 0.6, shrivel = heat ? span(t, 0.8, 2.4) : 0;
    const shaky = t < fallAt ? Math.sin(t * 17) * 7 * span(t, 0, fallAt) : 0; // wobbles harder and harder
    const ghostT = t - impact - 0.5;
    return {
      ...f, wobble: shaky, flip: bounce((t - fallAt) / 0.6), dead: t > impact - 0.2,
      sx: 1 - shrivel * 0.2, sy: (1 - shrivel * 0.4) * (heat ? 1 : 1 - span(t, 1, fallAt) * 0.12), parched: shrivel > 0.15,
      stars: heat ? 0 : (t < impact ? span(t, 0.2, 0.6) : 1 - span(t, impact, impact + 0.4)),
      steam: heat ? span(t, 0, 0.5) * (1 - span(t, impact, impact + 0.6)) : 0,
      dust: t >= impact ? t - impact : -1, shake: t >= impact ? Math.max(0, 1 - (t - impact) / 0.35) * 3 : 0,
      ghost: ghostT > 0 ? Math.sin(Math.min(1, ghostT / 4) * Math.PI) * 0.9 : 0, rise: Math.max(0, ghostT) * 20,
      fade: 1 - span(t, impact + 3, impact + 4.5) * 0.35
    };
  }

  /** Builds one animal (plus its stars, steam, dust and ghost) and returns something to draw each frame. */
  function create(parent, spot, kind) {
    const sp = SPECIES[kind] || SPECIES.cattle;
    const g = svg("g", { class: "critter" }, parent);
    const body = svg("g", {}, g);
    const legs = sp.legs.map((x) => svg("line", { x1: x, y1: sp.legTop, x2: x, y2: 0, stroke: sp.legInk, "stroke-width": sp.legW, "stroke-linecap": "round", class: "limb" }, body));
    const tail = svg("g", {}, body);
    const head = svg("g", {}, body);
    sp.art(body, head, tail);
    body.appendChild(head); // the head sits on top of the body
    const [ex, ey] = sp.eye;
    const eye = svg("circle", { cx: ex, cy: ey, r: 0.7, fill: sp.eyeInk }, head);
    const xEyes = svg("path", { d: `M${ex - 0.8} ${ey - 0.8}l1.6 1.6M${ex + 0.8} ${ey - 0.8}l-1.6 1.6`, stroke: sp.eyeInk, "stroke-width": 0.8, "stroke-linecap": "round", opacity: 0 }, head);

    const fx = svg("g", { class: "critter-fx" }, parent);
    const stars = [0, 1, 2].map(() => svg("path", { d: STAR, class: "star" }, fx));
    const steam = [0, 1, 2].map(() => svg("path", { d: "M0 0q1.5-2 0-4t0-4", class: "steam" }, fx));
    const dust = Array.from({ length: 7 }, () => svg("circle", { r: 2, class: kind === "chickens" ? "feather" : "dust" }, fx));
    const zap = svg("path", { class: "zap", opacity: 0 }, fx);

    // a cartoon spirit with wings and a halo floats up when an animal doesn't make it
    const ghost = svg("g", { class: "critter-ghost", opacity: 0 }, parent);
    const [hx, hy, hr] = sp.headGhost;
    svg("path", { d: sp.body }, ghost);
    svg("circle", { cx: hx, cy: hy, r: hr }, ghost);
    const wings = svg("path", { d: WINGS, class: "wings" }, ghost);
    svg("ellipse", { cx: 0, cy: -26, rx: 5.5, ry: 1.8, class: "halo" }, ghost);

    const c = { vis: 0, nod: 0, ph: Math.random() * 6, dying: 0 };

    /** Draws one frame. Returns how hard this animal is shaking the picture (0 when it isn't). */
    function draw({ t, dt, still, on, dying, delay, death, level }) {
      c.vis = approach(c.vis, on ? 1 : 0, dt, 3);
      if (!dying && c.dying > 0) c.vis = 0; // a fresh run: the animal walks back in
      c.dying = dying ? (still ? 60 : c.dying + dt) : 0; // reduced motion: skip straight to the end of the scene
      const F = fate(death, dying ? c.dying - delay : 0);
      const thirsty = spot.drink ? level > 0.08 : true;
      const down = thirsty && !F.dead && F.wobble === 0 && Math.sin(t * (spot.drink ? 0.8 : 0.5) + c.ph) > 0.15;
      c.nod = approach(c.nod, down ? 1 : 0, dt, 4);

      const s = spot.s * sp.scale, baseY = spot.y || 108;
      const x = spot.x - (1 - c.vis) * 24 * spot.face, y = baseY - F.lift;
      g.setAttribute("transform", `translate(${(x + F.dx).toFixed(1)} ${y.toFixed(1)}) scale(${spot.face * s} ${s}) rotate(${F.wobble.toFixed(1)}) rotate(${(F.spin + F.flip * 180).toFixed(1)} 0 -10.5)`);
      g.setAttribute("opacity", (c.vis * F.fade).toFixed(2));
      body.setAttribute("transform", `scale(${F.sx.toFixed(3)} ${F.sy.toFixed(3)})`);
      g.classList.toggle("parched", F.parched);
      g.classList.toggle("charred", F.charred);
      eye.setAttribute("opacity", F.dead ? 0 : 1);
      xEyes.setAttribute("opacity", F.dead ? 1 : 0);
      head.setAttribute("transform", `translate(${sp.headAt}) rotate(${(c.nod * sp.nod - (F.dead ? 20 : 0)).toFixed(1)})`);
      const swish = F.dead ? 0 : Math.sin(t * 2.2 + c.ph) * 14 + F.wobble;
      tail.setAttribute("transform", `translate(${sp.tailAt}) rotate(${swish.toFixed(1)})`);
      const step = c.vis < 0.98 ? Math.sin(t * 14) * 1.6 : F.wobble ? Math.sin(t * 30) * 1.2 : 0; // walking in, or knees knocking
      legs.forEach((leg, j) => leg.setAttribute("x2", (sp.legs[j] + (j % 2 ? step : -step)).toFixed(1)));

      // effects stay upright, so they're placed in the scene's own coordinates; skipped once there's nothing to show
      const active = dying || F.ghost > 0;
      if (!active && c.idle) return F.shake;
      c.idle = !active;
      const top = baseY + sp.starsY * s;
      stars.forEach((st, i) => {
        const a = t * 5 + (i * Math.PI * 2) / 3;
        st.setAttribute("transform", `translate(${(x + Math.cos(a) * 8 * s).toFixed(1)} ${(top + Math.sin(a) * 2.5).toFixed(1)}) scale(${s})`);
        st.setAttribute("opacity", (F.stars * c.vis).toFixed(2));
      });
      steam.forEach((st, i) => {
        const p = (t * 0.8 + i / 3) % 1;
        st.setAttribute("transform", `translate(${(x + (i - 1) * 6 * s).toFixed(1)} ${(baseY - 18 * s - p * 12).toFixed(1)})`);
        st.setAttribute("opacity", (F.steam * Math.sin(p * Math.PI) * 0.9).toFixed(2));
      });
      dust.forEach((d, i) => {
        const p = F.dust < 0 ? 1 : Math.min(1, F.dust / 0.9), a = Math.PI + (i / (dust.length - 1)) * Math.PI;
        d.setAttribute("cx", (x + Math.cos(a) * (6 + p * 16) * s).toFixed(1));
        d.setAttribute("cy", (baseY - 2 + Math.sin(a) * p * 9 * s).toFixed(1));
        d.setAttribute("r", (1 + p * 2.5 * s).toFixed(2));
        d.setAttribute("opacity", F.dust < 0 ? 0 : (1 - p).toFixed(2));
      });
      zap.setAttribute("d", `M${x + 4} 0l-6 ${(baseY * 0.35).toFixed(1)}h5l-7 ${(baseY * 0.35).toFixed(1)}h5l-3 ${(baseY * 0.3 - 10).toFixed(1)}`);
      zap.setAttribute("opacity", F.zap && Math.sin(t * 60) > -0.3 ? 1 : 0);

      wings.setAttribute("transform", `translate(0 -21) scale(1 ${(0.5 + 0.5 * Math.abs(Math.sin(t * 9))).toFixed(2)}) translate(0 21)`);
      ghost.setAttribute("opacity", F.ghost.toFixed(2));
      ghost.setAttribute("transform", `translate(${(x + Math.sin(t * 2 + c.ph) * 3).toFixed(1)} ${(baseY - 6 - F.rise).toFixed(1)}) scale(${spot.face * s * 1.15} ${s * 1.15})`);
      return F.shake;
    }

    return { draw };
  }

  /** Two buzzards that circle overhead once animals are lost. */
  function vultures(parent) {
    const birds = [0, 1].map(() => svg("path", { d: "M-7 0q3.5-4 7 0q3.5-4 7 0", class: "vulture" }, parent));
    let show = 0;
    return {
      draw(t, dt, on) {
        show = approach(show, on ? 1 : 0, dt, on ? 0.6 : 3);
        birds.forEach((b, i) => {
          const a = t * 0.7 + i * Math.PI;
          b.setAttribute("transform", `translate(${(110 + Math.cos(a) * 34).toFixed(1)} ${(26 + Math.sin(a) * 8).toFixed(1)}) scale(1 ${(0.6 + 0.4 * Math.abs(Math.sin(t * 4 + i))).toFixed(2)})`);
          b.setAttribute("opacity", show.toFixed(2));
        });
      }
    };
  }

  root.LabAnimals = { create, vultures, fate, SPECIES };
})(window);
