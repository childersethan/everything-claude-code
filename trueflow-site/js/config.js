/* Business details and page content. Edit this file to update the site.
   Anything marked PLACEHOLDER shows in dashed orange on the page until replaced. */
window.SITE = Object.freeze({
  biz: Object.freeze({
    phone: "(505) 793-5386",
    phoneTel: "+15057935386",
    email: "trueflow2026@gmail.com",
    city: "Hoxie, Kansas",
    areaShort: "Hoxie & surrounding farms",
    radius: 100,                       // service radius in miles
    // Home base and towns inside the radius, with coordinates for the service-area map
    base: { name: "Hoxie", lat: 39.357, lon: -100.441 },
    towns: [
      { name: "Hoxie", lat: 39.357, lon: -100.441 },
      { name: "Selden", lat: 39.541, lon: -100.567 },
      { name: "Oakley", lat: 39.133, lon: -100.864 },
      { name: "Colby", lat: 39.396, lon: -101.052 },
      { name: "Hill City", lat: 39.365, lon: -99.842 },
      { name: "Oberlin", lat: 39.818, lon: -100.528 },
      { name: "WaKeeney", lat: 39.025, lon: -99.880 },
      { name: "Norton", lat: 39.834, lon: -99.891 },
      { name: "Atwood", lat: 39.807, lon: -101.042 },
      { name: "Goodland", lat: 39.351, lon: -101.710 },
      { name: "Hays", lat: 38.879, lon: -99.327 }
    ],
    // 0=Sun … 6=Sat, [open, close] in 24h, null = closed. True Flow advertises 24-hour service.
    hours: { 0: [0, 24], 1: [0, 24], 2: [0, 24], 3: [0, 24], 4: [0, 24], 5: [0, 24], 6: [0, 24] },
    emergency: true,
    timeZone: "America/Chicago",       // Hoxie, KS is on Central time
    facebook: "https://www.facebook.com/profile.php?id=61574248502595",
    // Form delivery: paste an https form endpoint (e.g. a Formspree form URL) to receive requests by email.
    formEndpoint: "",
    // Job photos: put files in images/ and list them, e.g. { src: "images/pump-pull.jpg", cap: "Pump replacement, 320 ft" }
    photos: [
      { src: "images/windmill-boom-lift.jpg", cap: "Raising a windmill head with the boom truck" },
      { src: "images/cattle-tank-float.jpg", cap: "Stock tank with a new float switch, herd waiting" },
      { src: "images/solar-well-array.jpg", cap: "Solar well array behind the pipe gate" },
      { src: "images/windmill-tower.jpg", cap: "Pulling sucker rods on a windmill" },
      { src: "images/water-line-leak-repair.jpg", cap: "Water line leak, dug out and repaired" },
      { src: "images/solar-panel-hail-damage.jpg", cap: "Hail-damaged solar panel, ready for replacement" },
      { src: "images/stock-tank-float-switch.jpg", cap: "Float switch mounted on a stock tank" },
      { src: "images/frost-free-hydrant-dig.jpg", cap: "Digging out a frost-free hydrant" },
      { src: "images/hydrant-line-trench.jpg", cap: "Trenching to a fire hydrant line" }
    ]
  }),

  strip: ["24/hr service, day or night", "Water well installations", "Pump installation & repair", "Windmill service",
    "Solar well systems", "Irrigation wells", "Cattle tank installs", "Free estimates", "Licensed & insured"],

  // need: which "What do you need?" option the "Book this fix" button selects
  symptoms: [
    { icon: "drop", title: "No water at all", sub: "Faucets dry, nothing from the tank", urg: "high", when: "Same-day", need: "c1",
      head: "Pump isn't delivering",
      causes: "Tripped breaker, failed pressure switch, burned-out pump motor, or a broken drop pipe.",
      check: "Power at the well head, switch contacts, pump amp draw, and line pressure.",
      tip: "Leave the breaker off if it has tripped twice. Restarting a stalled pump can finish it off." },
    { icon: "gauge", title: "Low or weak pressure", sub: "Showers trickle, sprinklers struggle", urg: "med", when: "This week", need: "c2",
      head: "System isn't building pressure",
      causes: "Worn pump impeller, clogged filter, switch set too low, or a leak in the line.",
      check: "Gauge readings at cut-in and cut-out, filter condition, and pump output in GPM.",
      tip: "Swap or bypass any whole-house filter first. A clogged cartridge is the cheapest fix there is." },
    { icon: "cycle", title: "Pump clicks on and off fast", sub: "Short cycling every few seconds", urg: "med", when: "Soon", need: "c3",
      head: "Short cycling",
      causes: "Waterlogged pressure tank, lost air pre-charge, or a failed bladder.",
      check: "Tank pre-charge (should be 2 psi under cut-in), bladder, and the switch.",
      tip: "Every extra start wears the motor. Fixing the tank now can save the pump." },
    { icon: "air", title: "Sputtering or air in lines", sub: "Spitting faucets, cloudy water", urg: "med", when: "Soon", need: "c2",
      head: "Air getting into the system",
      causes: "Water level dropping near the pump, a cracked drop pipe, or a bad check valve.",
      check: "Static and pumping water level, check valves, and pipe joints.",
      tip: "In dry spells, spread out heavy use like irrigation and laundry." },
    { icon: "sand", title: "Sand or grit in water", sub: "Sediment in toilets and aerators", urg: "low", when: "Schedule", need: "c5",
      head: "Sediment coming up the well",
      causes: "Pump set too low, worn screen, or a pump oversized for the well's yield.",
      check: "Pump depth, flow rate against well yield, and the screen.",
      tip: "Sand also wears pumps from the inside. A sediment filter helps short-term." },
    { icon: "bolt", title: "Breaker keeps tripping", sub: "Well breaker won't stay on", urg: "high", when: "Same-day", need: "c1",
      head: "Electrical fault at the pump",
      causes: "Shorted motor, damaged wire splice, failing capacitor, or a seized pump.",
      check: "Insulation resistance on the well wire, control box parts, and amp draw.",
      tip: "Don't keep resetting it. Call, and keep the breaker off until we test it." },
    { icon: "windmill", title: "Windmill turns but won't pump", sub: "Wheel spins, little or no water", urg: "med", when: "Soon", need: "c6",
      head: "Windmill pump isn't lifting",
      causes: "Worn leathers in the pump cylinder, a broken or parted sucker rod, or a leaking drop pipe or check valve.",
      check: "Rod string, cylinder leathers and valves, drop pipe, and the gearbox and its oil.",
      tip: "Tie the wheel off in high wind until it's fixed. A free-spinning mill with a broken rod can tear itself up." },
    { icon: "sun", title: "Solar tank isn't filling", sub: "Stock tank low on a sunny day", urg: "high", when: "Same-day", need: "c6",
      head: "Solar pump isn't running",
      causes: "Stuck or failed float switch, a tripped or failed controller, hail-damaged panels, or a worn pump.",
      check: "Float switch, controller lights and fault codes, panel output, wiring, and pump draw.",
      tip: "Check the float isn't hung up first. If cattle are short on water, call now and haul water in the meantime." }
  ],

  // From True Flow's flyer
  services: [
    { icon: "down", tag: "Install", title: "Full water well installations", text: "From drilling to completion, we install complete water wells built to last." },
    { icon: "pump", tag: "Pumps", title: "Pump installation & repair", text: "Expert installation, repair and maintenance for all pump systems." },
    { icon: "windmill", tag: "Windmills", title: "Windmill service & repair", text: "Keep your windmill running strong, from the sucker rods to the wheel." },
    { icon: "sun", tag: "Solar", title: "Solar well systems", text: "Reliable, efficient water powered by the sun, for pastures with no power line." },
    { icon: "drop2", tag: "Ag", title: "Irrigation wells", text: "Water when and where you need it, sized to keep up all season." },
    { icon: "house", tag: "Home", title: "House wells", text: "Clean, dependable water for your home." },
    { icon: "trough", tag: "Livestock", title: "Cattle tank installs", text: "Durable cattle tank installs and float controls for water you can count on." },
    { icon: "tank", tag: "Pressure", title: "Pressure tank service", text: "Install, repair and maintain tanks for consistent pressure." },
    { icon: "box", tag: "Lines", title: "Trenching, water lines & leak repair", text: "Trenching and water line installs, plus fast leak detection and repair to stop damage." }
  ],

  gallerySlots: ["Pump pull and replacement", "Pressure tank swap", "Well house rebuild"]
});
