/* Inline SVG icons used by the page. Static markup only; never built from user input. */
window.ICONS = Object.freeze((() => {
  const sm = (p) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${p}</svg>`;
  const lg = (p) => `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  return {
    drop: sm('<path d="M12 3c-4 5-6 8-6 11a6 6 0 0 0 12 0c0-3-2-6-6-11Z"/><path d="M4 4l16 16"/>'),
    gauge: sm('<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l-4-4"/>'),
    cycle: sm('<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>'),
    air: sm('<circle cx="8" cy="14" r="3"/><circle cx="15" cy="8" r="2"/><circle cx="16" cy="16" r="2"/>'),
    sand: sm('<path d="M4 18h16"/><circle cx="7" cy="13" r="1"/><circle cx="12" cy="11" r="1"/><circle cx="17" cy="14" r="1"/><circle cx="10" cy="15" r="1"/>'),
    bolt: sm('<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>'),
    pump: lg('<rect x="15" y="6" width="10" height="28" rx="3"/><path d="M15 14h10M15 19h10M15 24h10"/>'),
    tank: lg('<rect x="11" y="6" width="18" height="28" rx="9"/><path d="M11 20h18"/>'),
    dial: lg('<path d="M6 26a14 14 0 0 1 28 0"/><path d="M20 26l7-8"/><circle cx="20" cy="26" r="2"/>'),
    box: lg('<rect x="9" y="7" width="22" height="26" rx="2"/><path d="M15 15h10M15 21h6"/>'),
    lens: lg('<circle cx="18" cy="18" r="9"/><path d="M25 25l8 8"/>'),
    down: lg('<path d="M20 4v26"/><path d="M12 22l8 8 8-8"/><path d="M8 36h24"/>'),
    camera: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/></svg>'
  };
})());
