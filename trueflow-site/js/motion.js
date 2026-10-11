/* Small helpers shared by the animated diagrams (home page well, Water Lab). */
(function (root) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const reduce = () => root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Creates an SVG element with attributes, optionally appending it to `parent`. */
  function svg(tag, attrs = {}, parent) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  }

  /** Moves `cur` toward `target` smoothly, frame-rate independent. Higher `rate` = snappier. */
  const approach = (cur, target, dt, rate) => target + (cur - target) * Math.exp(-rate * dt);

  /**
   * Runs frame(dt, t) on every animation frame while `el` is on screen and the tab is visible.
   * With reduced motion it draws one settled frame, frame(10, t, true), per change instead of animating.
   * Returns { invalidate } to redraw after the inputs change.
   */
  function loop(el, frame) {
    let raf = 0, last = 0, t = 0, inView = true;
    const query = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let still = !!(query && query.matches);
    const tick = (now) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now; t += dt;
      frame(dt, t);
      raf = requestAnimationFrame(tick);
    };
    const run = () => {
      cancelAnimationFrame(raf); raf = 0; last = 0;
      if (!still && inView && !document.hidden) raf = requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in root) {
      new IntersectionObserver(([en]) => { inView = en.isIntersecting; run(); }).observe(el);
    }
    document.addEventListener("visibilitychange", run);
    const settle = () => frame(10, t, true); // a big dt lets every eased value land on its target
    if (query && query.addEventListener) query.addEventListener("change", (e) => { still = e.matches; settle(); run(); });
    settle();
    run();
    // while animating, the next frame picks up new targets on its own
    return { invalidate: () => { if (still) settle(); } };
  }

  root.Motion = { svg, approach, loop, reduce };
})(window);
