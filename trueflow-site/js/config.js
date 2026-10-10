/* Business details and page content. Edit this file to update the site.
   Anything marked PLACEHOLDER shows in dashed orange on the page until replaced. */
window.SITE = Object.freeze({
  biz: Object.freeze({
    phone: "(000) 000-0000",           // PLACEHOLDER
    phoneTel: "",                      // e.g. "+18065550123"; leave empty until the real number is in
    email: "info@yourdomain.com",      // PLACEHOLDER
    city: "Your Town, TX",             // PLACEHOLDER
    areaShort: "your county & nearby", // PLACEHOLDER
    radius: 50,                        // PLACEHOLDER (miles)
    owner: "[owner name]",             // PLACEHOLDER
    towns: ["Town A", "Town B", "Town C", "Town D", "Town E", "Town F"], // PLACEHOLDER
    // PLACEHOLDER hours. 0=Sun … 6=Sat, [open, close] in 24h, null = closed
    hours: { 0: null, 1: [7, 18], 2: [7, 18], 3: [7, 18], 4: [7, 18], 5: [7, 18], 6: [8, 14] },
    emergency: true,
    facebook: "https://www.facebook.com/profile.php?id=61574248502595",
    // Form delivery: paste an https form endpoint (e.g. a Formspree form URL) to receive requests by email.
    formEndpoint: "",
    // Job photos: put files in images/ and list them, e.g. { src: "images/pump-pull.jpg", cap: "Pump replacement, 320 ft" }
    photos: [],
    placeholders: ["phone", "email", "city", "areaShort", "owner", "radius"]
  }),

  strip: ["Same-day no-water calls", "Submersible pumps", "Pressure tanks", "Constant pressure systems",
    "Well inspections", "Pressure switches", "Upfront pricing", "Farms & ranches"],

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
    { icon: "pump", tag: "Repair", title: "Well pump repair & replacement", text: "Submersible and jet pumps diagnosed, pulled, and replaced, sized to your well's depth and yield." },
    { icon: "tank", tag: "Pressure", title: "Pressure tanks", text: "Tank replacement, pre-charge checks, and bladder fixes that stop short cycling." },
    { icon: "dial", tag: "Upgrade", title: "Constant pressure systems", text: "Variable-speed setups that hold steady pressure when the shower and the washer run together." },
    { icon: "box", tag: "Controls", title: "Switches & control boxes", text: "Pressure switches, capacitors, relays, and wiring at the well head and in the well house." },
    { icon: "lens", tag: "Inspect", title: "Well inspections", text: "Flow and pressure testing for home sales, new owners, or peace of mind before summer." },
    { icon: "down", tag: "Install", title: "New pump installs", text: "Complete pump, pipe, wire, and tank installs for new wells, barns, and livestock water." }
  ],

  // SAMPLE reviews. Replace with real reviews from the Facebook page.
  reviews: [
    { quote: "Water quit on a Sunday night. They were out first thing Monday and had us running by lunch.", who: "Sample review · Homeowner" },
    { quote: "Explained exactly what was wrong with our pressure tank and didn't try to sell us a pump we didn't need.", who: "Sample review · Rural property" },
    { quote: "Fair price, showed up when they said, cleaned up after. That's all you can ask for.", who: "Sample review · Ranch owner" }
  ],

  gallerySlots: ["Pump pull and replacement", "Pressure tank swap", "Well house rebuild"]
});
