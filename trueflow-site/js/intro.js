/* Home page opening sequence. With motion allowed, pins the photos to the screen and, as the visitor scrolls,
   tells each scene and line of type where it is in its run (--t); css/intro.css does the rest.
   With reduced motion it does nothing, so the section stays a single photo with the tagline and call buttons
   and the sequence's other photos (data-src) are never downloaded. */
(function () {
  "use strict";
  const intro = document.getElementById("intro");
  if (!intro || (window.Motion && Motion.reduce())) return;

  const shots = [...intro.querySelectorAll(".intro-shot")];
  const lines = [...intro.querySelectorAll(".intro-line")];
  const end = intro.querySelector(".intro-end");
  const stage = intro.querySelector(".intro-stage");
  // the header's bar only: the phone menu drawer lives in the header too and must not count
  const bar = document.querySelector("header.top > .wrap");
  const count = shots.length;
  // the first scene starts already showing, and the last one gets extra room so the call buttons settle before the page moves on
  const START = 0.4, END = 0.95;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  let raf = 0;

  function draw() {
    raf = 0;
    const box = intro.getBoundingClientRect();
    const run = box.height - stage.offsetHeight;
    const p = run > 0 ? clamp((stage.getBoundingClientRect().top - box.top) / run, 0, 1) : 1;
    const pos = START + p * (count - 1 - START + END);
    intro.style.setProperty("--p", p.toFixed(4));
    for (let i = 0; i < count; i++) {
      const t = clamp(pos - i, -1, 2).toFixed(4);
      shots[i].style.setProperty("--t", t);
      if (lines[i]) lines[i].style.setProperty("--t", t);
    }
    // the call buttons sit over every scene; keep them out of taps and Tab order until they've faded in
    end.inert = pos - (count - 1) < 0.25;
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(draw); };
  const fitHeader = () => { intro.style.setProperty("--hdr", (bar ? bar.offsetHeight + 1 : 0) + "px"); queue(); }; // +1 for its bottom border

  // wrap each word (and each small caption) so the CSS can move them one by one
  lines.forEach((line) => {
    let i = 0;
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement("span");
          w.className = "w"; w.style.setProperty("--i", i++); w.textContent = part;
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType !== 1) {
        return;
      } else if (n.matches(".intro-kicker, .intro-sub")) {
        n.classList.add("w"); n.style.setProperty("--i", i++);
      } else if (!n.matches(".cta-row, .values")) walk(n);
    });
    walk(line);
  });
  intro.querySelectorAll("img[data-src]").forEach((img) => { img.src = img.dataset.src; });
  intro.classList.add("live");
  fitHeader();
  draw();
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  // re-measure when the bar changes height, e.g. once the web fonts arrive
  if (bar && "ResizeObserver" in window) new ResizeObserver(fitHeader).observe(bar);
})();
