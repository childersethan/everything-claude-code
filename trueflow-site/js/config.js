/* Business details and page content. Edit this file to update the site.
   Anything marked PLACEHOLDER shows in dashed orange on the page until replaced. */
window.SITE = Object.freeze({
  biz: Object.freeze({
    phone: "(505) 793-5386",
    phoneTel: "+15057935386",
    email: "info@yourdomain.com",      // PLACEHOLDER
    city: "Hoxie, Kansas",
    areaShort: "Hoxie & surrounding farms",
    radius: 50,                        // PLACEHOLDER (miles)
    owner: "[owner name]",             // PLACEHOLDER
    towns: ["Hoxie", "Town B", "Town C", "Town D", "Town E", "Town F"],
    knownTowns: ["Hoxie"],             // towns confirmed from Facebook; the rest are placeholders
    // 0=Sun … 6=Sat, [open, close] in 24h, null = closed. True Flow advertises 24-hour service.
    hours: { 0: [0, 24], 1: [0, 24], 2: [0, 24], 3: [0, 24], 4: [0, 24], 5: [0, 24], 6: [0, 24] },
    emergency: true,
    timeZone: "America/Chicago",       // Hoxie, KS is on Central time
    facebook: "https://www.facebook.com/profile.php?id=61574248502595",
    // Form delivery: paste an https form endpoint (e.g. a Formspree form URL) to receive requests by email.
    formEndpoint: "",
    // Job photos: put files in images/ and list them, e.g. { src: "images/pump-pull.jpg", cap: "Pump replacement, 320 ft" }
    photos: [],
    placeholders: ["email", "owner", "radius"]
  }),

  strip: ["24-hour service", "Water well installation", "Pump repair", "Windmill & solar systems",
    "Irrigation wells", "Trenching", "Leak repair & plumbing", "Farms & ranches"],

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
      tip: "Don't keep resetting it. Call, and keep the breaker off until we test it." }
  ],

  services: [
    { icon: "down", tag: "Install", title: "Water well installation", text: "New wells for homes, barns and pasture, finished with the pump, pipe, wire and tank to put them to work." },
    { icon: "pump", tag: "Repair", title: "Pump repair", text: "Submersible and jet pumps diagnosed, pulled and fixed or replaced, sized to your well's depth and yield." },
    { icon: "tank", tag: "Replace", title: "Full system replacements", text: "Pump, pressure tank, switch and controls replaced together when an old system is worn out." },
    { icon: "windmill", tag: "Off-grid", title: "Windmill & solar systems", text: "Windmill repair and solar pumping for stock tanks and pastures with no power line." },
    { icon: "drop2", tag: "Ag", title: "Irrigation wells", text: "Wells and pumps sized for irrigation, built to keep up through the growing season." },
    { icon: "box", tag: "Lines", title: "Trenching, leak repair & plumbing", text: "Trenching for water lines, finding and fixing leaks, and the plumbing between the well and the house." }
  ],

  // SAMPLE reviews. Replace with real reviews from the Facebook page.
  reviews: [
    { quote: "Water quit on a Sunday night. They were out first thing Monday and had us running by lunch.", who: "Sample review · Homeowner" },
    { quote: "Explained exactly what was wrong with our pressure tank and didn't try to sell us a pump we didn't need.", who: "Sample review · Rural property" },
    { quote: "Fair price, showed up when they said, cleaned up after. That's all you can ask for.", who: "Sample review · Ranch owner" }
  ],

  gallerySlots: ["Pump pull and replacement", "Pressure tank swap", "Well house rebuild"]
});
