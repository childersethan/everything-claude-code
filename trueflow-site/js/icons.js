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
    play: sm('<path d="M7 4v16l13-8Z" fill="currentColor"/>'),
    cloud: sm('<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18Z"/>'),
    calm: sm('<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3"/><path d="M4 4l16 16"/>'),
    heat: sm('<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Z"/><path d="M12 9v7"/>'),
    storm: sm('<path d="M7 15h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 15Z"/><path d="m12 15-2 4h3l-2 4"/>'),
    cow: lg('<path d="M13 14h14v10a7 7 0 0 1-14 0Z"/><path d="M13 16 6 13l2-5M27 16l7-3-2-5"/><path d="M17 27h.01M23 27h.01"/>'),
    goat: lg('<path d="M14 15h12l-2 12a4 4 0 0 1-8 0Z"/><path d="M15 15q-6-4-3-10M25 15q6-4 3-10"/><path d="M14 18 8 20M26 18l6 2"/><path d="M20 31v5"/>'),
    chicken: lg('<path d="M10 22a10 9 0 0 0 20 2l4-10-6 3a8 8 0 0 0-14-4"/><path d="M14 13q1-5 4-3 2-4 4 1"/><path d="M9 15l-4 1 4 2"/><path d="M17 31v5M23 31v5"/><circle cx="13" cy="15" r=".6" fill="currentColor"/>'),
    bolt: sm('<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>'),
    pump: lg('<rect x="15" y="6" width="10" height="28" rx="3"/><path d="M15 14h10M15 19h10M15 24h10"/>'),
    tank: lg('<rect x="11" y="6" width="18" height="28" rx="9"/><path d="M11 20h18"/>'),
    dial: lg('<path d="M6 26a14 14 0 0 1 28 0"/><path d="M20 26l7-8"/><circle cx="20" cy="26" r="2"/>'),
    box: lg('<rect x="9" y="7" width="22" height="26" rx="2"/><path d="M15 15h10M15 21h6"/>'),
    windmill: lg('<path d="M20 20v16M15 36h10"/><path d="M20 20 12 8M20 20l12-4M20 20l-2 10M20 20 8 22M20 20l8-12"/><circle cx="20" cy="20" r="2"/>'),
    drop2: lg('<path d="M20 5c-7 9-11 14-11 19a11 11 0 0 0 22 0c0-5-4-10-11-19Z"/><path d="M14 26a6 6 0 0 0 6 6"/>'),
    sun: lg('<circle cx="20" cy="17" r="6"/><path d="M20 4v3M20 27v3M7 17h3M30 17h3M10.8 7.8l2.1 2.1M27.1 24.1l2.1 2.1M10.8 26.2l2.1-2.1M27.1 9.9l2.1-2.1"/><path d="M8 36h24"/>'),
    house: lg('<path d="M6 20 20 8l14 12"/><path d="M10 17v17h20V17"/><path d="M17 34v-9h6v9"/>'),
    trough: lg('<path d="M5 18h30l-3 12H8Z"/><path d="M9 23h22"/><path d="M12 30v5M28 30v5"/>'),
    lens: lg('<circle cx="18" cy="18" r="9"/><path d="M25 25l8 8"/>'),
    down: lg('<path d="M20 4v26"/><path d="M12 22l8 8 8-8"/><path d="M8 36h24"/>'),
    camera: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/></svg>'
  };
})());
