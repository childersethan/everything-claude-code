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
  const count = shots.length;
  // the first scene starts already showing, and the last one gets extra room so the call buttons settle before the page moves on
  const START = 0.3, END = 0.95;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  let raf = 0;

  function draw() {
    raf = 0;
    const box = intro.getBoundingClientRect();
    const run = box.height - innerHeight;
    const p = run > 0 ? clamp(-box.top / run, 0, 1) : 1;
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

  intro.querySelectorAll("img[data-src]").forEach((img) => { img.src = img.dataset.src; });
  intro.classList.add("live");
  draw();
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
})();
