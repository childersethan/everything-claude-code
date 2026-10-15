/* Water Lab sim picker: Livestock, Irrigation well or House well.
   Shows one panel at a time, keeps the choice in the URL (lab.html#house) and tells the sims with a "labmode" event. */
(function () {
  "use strict";
  const picker = document.querySelector(".lab-modes");
  if (!picker) return;
  const panels = [...document.querySelectorAll("[data-mode-panel]")];
  const MODES = panels.map((p) => p.dataset.modePanel);
  const lede = document.getElementById("labLede");

  function show(mode, remember) {
    panels.forEach((p) => { p.hidden = p.dataset.modePanel !== mode; });
    MODES.forEach((m) => document.getElementById("mode-" + m).setAttribute("aria-pressed", String(m === mode)));
    lede.textContent = panels.find((p) => p.dataset.modePanel === mode).dataset.lede;
    if (remember) history.replaceState(null, "", mode === MODES[0] ? location.pathname + location.search : "#" + mode);
    document.dispatchEvent(new CustomEvent("labmode", { detail: mode }));
  }

  MODES.forEach((m) => document.getElementById("mode-" + m).addEventListener("click", () => show(m, true)));
  const ALIASES = { pivot: "irrigation" }; // the old pivot sim's links land on the irrigation well
  const fromHash = () => { const h = location.hash.slice(1), m = ALIASES[h] || h || MODES[0]; if (MODES.includes(m)) show(m, false); };
  if (location.hash) fromHash();
  addEventListener("hashchange", fromHash); // a link to lab.html#house on this page switches too
})();
