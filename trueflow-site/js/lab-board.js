/* The step-by-step board under a Water Lab diagram, shared by every sim (livestock, irrigation well, house).
   Markup, with <p> the panel's id prefix (see src/pages/lab.html):
     button #<p>Run > #<p>Label, and inside the figure #<p>Board > #<p>Day, #<p>Note, ol#<p>Days, #<p>Result.
   Result levels share the four colors in site.css: "thrived" (good), "tight", "thirsty" (bad), "lost" (worst). */
(function (root) {
  "use strict";
  const ICONS = root.ICONS || {};
  const STARS = { thrived: 3, tight: 2, thirsty: 1, lost: 0 };
  /** One item at random, for a fresh fun fact each run. */
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  /**
   * create("sim", { idle: "Run a 30-day sim", scene: svgElement }) returns { play, stop, result, celebrate, catastrophe }.
   * Call celebrate() when a run survives and catastrophe() when it fails, after result().
   * play(steps, { stepMs, cell(step) => { kind, icon, level, bad }, head(step, i), note(step), onStep(step, i), onDone() })
   */
  function create(prefix, { idle, scene }) {
    const $ = (s) => document.getElementById(prefix + s);
    const els = { board: $("Board"), day: $("Day"), note: $("Note"), days: $("Days"), result: $("Result"), label: $("Label") };
    let timer = 0;

    const fig = scene ? scene.closest(".lab-scene") : null;
    let fx = null;
    const clearFx = () => { if (fx) { fx.remove(); fx = null; } if (fig) fig.classList.remove("sim-quake"); };

    /** Confetti over the diagram: the sim survived. */
    function celebrate() {
      clearFx();
      if (!fig || root.Motion.reduce()) return;
      fx = document.createElement("div");
      fx.className = "sim-confetti";
      fx.setAttribute("aria-hidden", "true");
      const colors = ["var(--water)", "var(--signal)", "var(--brand)", "#3fae5a", "#fff"];
      for (let i = 0; i < 70; i++) {
        const bit = document.createElement("i");
        bit.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;background:${colors[i % colors.length]};` +
          `--drift:${(Math.random() * 120 - 60).toFixed(0)}px;--spin:${(Math.random() * 1080 - 540).toFixed(0)}deg;` +
          `animation-delay:${(Math.random() * 0.6).toFixed(2)}s;animation-duration:${(1.8 + Math.random() * 1.4).toFixed(2)}s`;
        fx.appendChild(bit);
      }
      fig.appendChild(fx);
    }

    /** A red flash and a shake: the sim failed. The scene draws the disaster itself. */
    function catastrophe() {
      clearFx();
      if (!fig || root.Motion.reduce()) return;
      fx = document.createElement("div");
      fx.className = "sim-alarm";
      fx.setAttribute("aria-hidden", "true");
      fig.appendChild(fx);
      fig.classList.add("sim-quake");
    }

    function stop() {
      clearTimeout(timer);
      timer = 0;
      clearFx();
      els.board.hidden = true;
      els.result.textContent = "";
      els.label.textContent = idle;
    }

    function showStep(step, i, opts) {
      const c = opts.cell(step), li = els.days.children[i];
      li.classList.add("on");
      li.classList.toggle("dry", !!c.bad);
      li.style.setProperty("--lvl", Math.round(Math.max(0, Math.min(1, c.level)) * 100) + "%");
      els.day.textContent = opts.head(step, i);
      els.note.textContent = opts.note ? opts.note(step) || "" : "";
      if (opts.onStep) opts.onStep(step, i);
    }

    function play(steps, opts) {
      stop();
      els.days.innerHTML = steps.map((s) => {
        const c = opts.cell(s);
        return `<li class="w-${c.kind}"><span class="ic">${ICONS[c.icon] || ""}</span><span class="bar"><i></i></span></li>`;
      }).join("");
      els.days.style.setProperty("--cols", Math.ceil(steps.length / 2));
      els.board.hidden = false;
      els.label.textContent = "Running...";
      if (scene) { // bring the diagram into view so the run can be watched
        const box = scene.getBoundingClientRect();
        if (box.top < 0 || box.bottom > innerHeight) scene.closest(".lab-scene").scrollIntoView({ behavior: root.Motion.reduce() ? "auto" : "smooth", block: "start" });
      }
      if (root.Motion.reduce()) { // reduced motion: show the whole run at once
        steps.forEach((s, i) => showStep(s, i, opts));
        timer = setTimeout(opts.onDone, 50); // after the board is shown, so screen readers announce the result
        return;
      }
      let i = 0;
      const next = () => {
        showStep(steps[i], i, opts);
        i += 1;
        timer = setTimeout(i < steps.length ? next : opts.onDone, opts.stepMs || 260);
      };
      next();
    }

    /** Shows the ending with a star score and a fun fact. `icon` is a key of window.ICONS; text is set as text, never as HTML. */
    function result({ level, title, text, icon, fact }, head) {
      const res = els.result, stars = STARS[level] ?? 0;
      res.className = "sim-result " + level;
      res.innerHTML = `<span class="ic">${ICONS[icon] || ""}</span><div class="res-head"><b></b><span class="stars" role="img"></span></div><p></p>` +
        (fact ? `<p class="fact"><strong>Did you know?</strong> <span></span></p>` : "");
      res.querySelector("b").textContent = title;
      const st = res.querySelector(".stars");
      st.setAttribute("aria-label", `${stars} of 3 stars`);
      st.innerHTML = [0, 1, 2].map((i) => `<i class="${i < stars ? "on" : ""}" style="--i:${i}">★</i>`).join("");
      res.querySelector("p").textContent = text;
      if (fact) res.querySelector(".fact span").textContent = fact;
      els.note.textContent = "";
      els.day.textContent = head;
      els.label.textContent = "Play again";
    }

    return { play, stop, result, celebrate, catastrophe };
  }

  root.SimBoard = { create, pick };
})(window);
