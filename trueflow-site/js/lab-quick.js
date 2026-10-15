/* Water Lab quick picks: big "Small / Medium / Big" style buttons that set the detailed controls for you.
   A button with data-set="pvGpm=800;pvWeather=hot" puts those values in those inputs and fires the same
   input or change event a person would, so each sim's own wiring does the rest. A button shows pressed
   while every value it sets still matches, so tinkering with a slider in "Tinker with the numbers" stays in sync. */
(function () {
  "use strict";
  const buttons = [...document.querySelectorAll("button[data-set]")];
  if (!buttons.length) return;

  /** "a=1;b=hot" -> [[inputA, "1"], [inputB, "hot"]] */
  const pairs = (btn) => btn.dataset.set.split(";").map((kv) => {
    const [id, value] = kv.split("=");
    const el = document.getElementById(id);
    if (!el) throw new Error(`Quick pick points at a missing control: #${id}`);
    return [el, value];
  });
  const matches = (el, value) => String(el.value) === value || Number(el.value) === Number(value);

  function sync() {
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(pairs(b).every(([el, v]) => matches(el, v)))));
  }

  buttons.forEach((b) => b.addEventListener("click", () => {
    pairs(b).forEach(([el, v]) => {
      if (matches(el, v)) return;
      el.value = v;
      el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    });
    sync();
  }));
  document.addEventListener("input", sync);
  document.addEventListener("change", sync);
  sync();
})();
