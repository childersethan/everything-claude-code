/* Page wiring. Content lives in config.js, calculations in sizing.js, icons in icons.js. */
(function () {
  "use strict";
  const { biz: BIZ } = window.SITE;
  const SITE = window.SITE, S = window.Sizing, ICONS = window.ICONS;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /** Calls onChange(true/false) as `el` scrolls in/out of view or the tab is hidden/shown. */
  function whenActive(el, onChange) {
    let inView = true;
    const update = () => onChange(inView && !document.hidden);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => { inView = en.isIntersecting; update(); }).observe(el);
    }
    document.addEventListener("visibilitychange", update);
    update();
  }
  const restartAnim = (el) => { el.classList.remove("fade-swap"); void el.offsetWidth; el.classList.add("fade-swap"); };

  function fillFields() {
    $$("[data-f]").forEach((el) => {
      const k = el.dataset.f;
      el.textContent = BIZ[k];
    });
    // these only exist on some pages
    if ($("#fbLink")) $("#fbLink").href = BIZ.facebook;
    if ($("#mailLink")) $("#mailLink").href = "mailto:" + BIZ.email;
    if (BIZ.phoneTel) $$("[data-tel]").forEach((a) => { a.href = "tel:" + BIZ.phoneTel; });
    if ($("#yr")) $("#yr").textContent = new Date().getFullYear();
  }

  function initCopyPhone() {
    const bp = $("#bigPhone");
    const selectIt = () => { const r = document.createRange(); r.selectNodeContents(bp); getSelection().removeAllRanges(); getSelection().addRange(r); };
    const copy = () => {
      if (!navigator.clipboard) { selectIt(); return; }
      navigator.clipboard.writeText(BIZ.phone).then(() => {
        bp.textContent = "Copied";
        setTimeout(() => { bp.textContent = BIZ.phone; }, 1100);
      }).catch(selectIt);
    };
    bp.addEventListener("click", copy);
    bp.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copy(); } });
  }

  function initDiagnoser() {
    const URG = { high: "Urgent", med: "Needs attention", low: "Not urgent" };
    let ticketNo = 1;
    $("#symptoms").innerHTML = SITE.symptoms.map((d, i) =>
      `<button type="button" class="symptom" data-i="${i}"><span class="ico">${ICONS[d.icon]}</span><span><strong>${esc(d.title)}</strong><small>${esc(d.sub)}</small></span></button>`).join("");
    const show = (n) => {
      const d = SITE.symptoms[n];
      $$(".symptom").forEach((b, i) => b.setAttribute("aria-pressed", String(i === n)));
      $("#tNo").textContent = "No. TF-" + String(1000 + (ticketNo++ * 37) % 9000).padStart(4, "0");
      const t = $("#ticket");
      t.innerHTML = `<span class="urg ${esc(d.urg)}">${esc(URG[d.urg])} · ${esc(d.when)}</span>
        <h3>${esc(d.head)}</h3>
        <dl><dt>Likely</dt><dd>${esc(d.causes)}</dd><dt>We check</dt><dd>${esc(d.check)}</dd><dt>Right now</dt><dd>${esc(d.tip)}</dd></dl>
        <a class="btn btn-primary" href="contact.html?${new URLSearchParams({ need: d.need, issue: d.title })}" style="justify-self:start">Book this fix</a>`;
      restartAnim(t);
    };
    $$(".symptom").forEach((b) => b.addEventListener("click", () => show(Number(b.dataset.i))));
    show(0);
  }

  function initServices() {
    $("#svcGrid").innerHTML = SITE.services.map((s) =>
      `<article class="svc reveal">${ICONS[s.icon]}<span class="tag">${esc(s.tag)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></article>`).join("");
  }

  function initSizingTools() {
    const tabs = [["tabFlow", ["panelFlow", "outFlow"]], ["tabTank", ["panelTank", "outTank"]]];
    const select = (id, focus) => tabs.forEach(([tid, panes]) => {
      const on = tid === id, tab = $("#" + tid);
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
      panes.forEach((p) => { $("#" + p).hidden = !on; });
    });
    tabs.forEach(([id], i) => {
      const tab = $("#" + id);
      tab.addEventListener("click", () => select(id, false));
      tab.addEventListener("keydown", (e) => {
        const move = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: tabs.length - 1 - i }[e.key];
        if (move === undefined) return;
        e.preventDefault();
        select(tabs[(i + move + tabs.length) % tabs.length][0], true);
      });
    });

    let counts = { bath: 2, kit: 3, hose: 2 };
    const renderFlow = () => {
      const { gpm, notes } = S.pumpFlow(counts, { irrigation: $("#xIrr").checked, livestock: $("#xStock").checked });
      $("#gpmOut").textContent = gpm;
      $("#gpmBar").style.width = Math.min(100, (gpm / 30) * 100) + "%";
      $("#gpmNotes").innerHTML = notes.map((n) => `<li>${esc(n)}</li>`).join("");
    };
    $$("[data-step]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.step;
      counts = S.stepCount(counts, k, Number(b.dataset.d));
      $("#o-" + k).textContent = counts[k];
      renderFlow();
    }));
    ["xIrr", "xStock"].forEach((id) => $("#" + id).addEventListener("change", renderFlow));
    renderFlow();

    const renderTank = () => {
      const reading = Number($("#tankAir").value);
      const { target, advice } = S.tankPrecharge(Number($("#cutIn").value), reading);
      $("#preOut").textContent = target;
      $("#preBar").style.width = Math.min(100, (reading / 60) * 100) + "%";
      $("#tankAir").setAttribute("aria-valuetext", reading + " psi");
      $("#preMsg").textContent = `Your tank reads ${reading} psi. ${advice}`;
    };
    $("#cutIn").addEventListener("change", renderTank);
    $("#tankAir").addEventListener("input", renderTank);
    renderTank();
  }

  function initGallery() {
    const photos = BIZ.photos;
    if (!photos.length) {
      $("#gallery").innerHTML = SITE.gallerySlots.map((c) => `<figure class="shot empty"><div>${ICONS.camera}<b>${esc(c)}</b><span class="ph">Add a job photo</span></div></figure>`).join("");
      return;
    }
    $("#gallery").innerHTML = photos.map((p, i) =>
      `<figure class="shot"><button type="button" data-photo="${i}" aria-label="View larger: ${esc(p.cap)}"><img src="${esc(p.src)}" alt="${esc(p.cap)}" loading="lazy"></button><figcaption>${esc(p.cap)}</figcaption></figure>`).join("");
    initLightbox(photos);
  }

  function initLightbox(photos) {
    const box = $("#lightbox");
    if (typeof box.showModal !== "function") return; // very old browsers: thumbnails only
    let idx = 0, opener = null;
    const show = (n) => {
      idx = (n + photos.length) % photos.length;
      const img = $("#lbImg");
      img.classList.add("loading"); // hide the previous photo until the next one has loaded
      img.onload = () => img.classList.remove("loading");
      img.src = photos[idx].src;
      img.alt = photos[idx].cap;
      if (img.complete && img.naturalWidth) img.classList.remove("loading");
      $("#lbCap").textContent = `${photos[idx].cap} (${idx + 1} of ${photos.length})`;
    };
    $$("[data-photo]").forEach((b) => b.addEventListener("click", () => {
      opener = b;
      show(Number(b.dataset.photo));
      box.showModal();
    }));
    $("#lbPrev").addEventListener("click", () => show(idx - 1));
    $("#lbNext").addEventListener("click", () => show(idx + 1));
    $("#lbClose").addEventListener("click", () => box.close());
    box.addEventListener("click", (e) => { if (e.target === box) box.close(); });
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    box.addEventListener("close", () => opener?.focus());
  }

  function initArea() {
    $("#towns").innerHTML = BIZ.towns.map((t) => `<span>${esc(t.name)}</span>`).join("");
    const check = () => {
      const v = $("#zip").value.trim();
      const out = $("#zipOut");
      if (!v) { out.textContent = "Type a town name first."; return; }
      const hit = S.findTown(BIZ.towns, v);
      if (hit) {
        const mi = Math.round(S.milesBetween(BIZ.base, hit));
        out.textContent = mi < 5
          ? `${hit.name} is home base. Call or text and we'll be there.`
          : `Yes, ${hit.name} is about ${mi} miles from ${BIZ.base.name}, well inside our ${BIZ.radius}-mile range.`;
        return;
      }
      out.textContent = `${v} isn't on this list, but we cover about ${BIZ.radius} miles around ${BIZ.base.name}. Call or text and we'll tell you.`;
    };
    $("#zipBtn").addEventListener("click", check);
    $("#zip").addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
    drawRadar();
  }

  function drawRadar() {
    const c = $("#radar"), x = c.getContext("2d"), W = c.width, C = W / 2;
    const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    // place each town by its real bearing and distance from home base
    const pts = BIZ.towns.filter((t) => t.name !== BIZ.base.name).map((t) => ({
      t: t.name, a: ((S.bearing(BIZ.base, t) - 90) * Math.PI) / 180, r: Math.min(1, S.milesBetween(BIZ.base, t) / BIZ.radius)
    }));
    let a0 = 0, running = false;
    const draw = () => {
      const water = css("--water"), line = css("--line"), ink = css("--ink"), sig = css("--signal"), surf = css("--surface");
      x.clearRect(0, 0, W, W);
      x.fillStyle = surf; x.beginPath(); x.arc(C, C, C - 4, 0, 7); x.fill();
      x.strokeStyle = line; x.lineWidth = 2;
      for (let i = 1; i <= 4; i++) { x.beginPath(); x.arc(C, C, ((C - 8) * i) / 4, 0, 7); x.stroke(); }
      x.beginPath(); x.moveTo(8, C); x.lineTo(W - 8, C); x.moveTo(C, 8); x.lineTo(C, W - 8); x.stroke();
      if (x.createConicGradient) {
        const g = x.createConicGradient(a0, C, C);
        g.addColorStop(0, water + "00"); g.addColorStop(0.9, water + "00"); g.addColorStop(1, water + "88");
        x.fillStyle = g; x.beginPath(); x.arc(C, C, C - 8, 0, 7); x.fill();
      }
      x.font = "600 24px Figtree, sans-serif"; x.textAlign = "center";
      pts.forEach((p) => {
        const px = C + Math.cos(p.a) * p.r * (C - 8), py = C + Math.sin(p.a) * p.r * (C - 8);
        x.fillStyle = water; x.beginPath(); x.arc(px, py, 9, 0, 7); x.fill();
        x.fillStyle = ink; x.fillText(p.t, px, py - 18);
      });
      x.fillStyle = sig; x.beginPath(); x.arc(C, C, 16, 0, 7); x.fill();
      x.strokeStyle = ink; x.lineWidth = 3; x.stroke();
      x.fillStyle = ink; x.font = "700 22px 'JetBrains Mono', monospace";
      x.fillText(BIZ.radius + " mi", C, 40);
      x.fillText(BIZ.base.name.toUpperCase(), C, C + 46);
      a0 += 0.012;
      if (running) requestAnimationFrame(draw);
    };
    draw();
    if (reduce) return;
    whenActive(c, (on) => {
      const wasRunning = running;
      running = on;
      if (on && !wasRunning) requestAnimationFrame(draw);
    });
  }

  function initHours() {
    const open = S.isOpenNow(BIZ.hours, new Date(), BIZ.timeZone);
    $("#openPill").textContent = open ? "Open now" : BIZ.emergency ? "After hours · emergency line open" : "Closed now";
  }

  function initForm() {
    const f = $("#reqForm"), msg = $("#formMsg"), btn = f.querySelector("[type=submit]");
    // "Book this fix" on the Diagnose page links here with the symptom filled in
    const q = new URLSearchParams(location.search);
    if (/^c[1-6]$/.test(q.get("need") || "")) $("#" + q.get("need")).checked = true;
    const issue = SITE.symptoms.find((d) => d.title === q.get("issue"));
    if (issue) $("#fMsg").value = S.prefillMessage($("#fMsg").value, issue.title);
    const fields = { name: $("#fName"), phone: $("#fPhone") };
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const problem = S.validateRequest({ name: fields.name.value, phone: fields.phone.value });
      Object.values(fields).forEach((el) => el.removeAttribute("aria-invalid"));
      if (problem) {
        msg.textContent = problem.message;
        fields[problem.field].setAttribute("aria-invalid", "true");
        fields[problem.field].focus();
        return;
      }
      const first = fields.name.value.trim().split(/\s+/)[0];
      // bots fill the hidden field; pretend success and send nothing
      if ($("#fGotcha").value) { msg.textContent = `Thanks, ${first}.`; f.reset(); return; }
      // Netlify Forms needs the page served over http(s); file:// and the artifact preview can't send.
      // Netlify strips data-netlify from the deployed page, so the form carries its own data-delivery marker.
      const external = /^https:\/\//.test(BIZ.formEndpoint);
      const netlify = !external && f.dataset.delivery === "netlify" && /^https?:$/.test(location.protocol);
      if (!external && !netlify) {
        msg.textContent = `Thanks, ${first}. This preview doesn't send yet. Once the form is connected, requests go straight to True Flow's inbox.`;
        return;
      }
      btn.disabled = true;
      msg.textContent = "Sending…";
      try {
        const r = external
          ? await fetch(BIZ.formEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(f) })
          : await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(f)).toString() });
        if (!r.ok) throw new Error("Form service returned " + r.status);
        f.reset();
        msg.textContent = `Got it, ${first}. We'll call you back shortly.`;
      } catch (err) {
        msg.textContent = `That didn't go through. Please call ${BIZ.phone} instead.`;
      } finally {
        btn.disabled = false;
      }
    });
  }

  function initMenu() {
    const btn = $("#menuBtn"), drawer = $("#drawer");
    const set = (open) => {
      drawer.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    btn.addEventListener("click", () => set(drawer.hidden));
    drawer.addEventListener("click", (e) => { if (e.target.tagName === "A") set(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawer.hidden) { set(false); btn.focus(); } });
  }

  function addStructuredData() {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const pad = (h) => String(h).padStart(2, "0") + ":00";
    const data = {
      "@context": "https://schema.org", "@type": "Plumber", name: "True Flow Pump & Well Services",
      telephone: BIZ.phone, ...(BIZ.email ? { email: BIZ.email } : {}), areaServed: BIZ.towns.map((t) => t.name),
      url: BIZ.website, image: BIZ.website + "images/share.jpg",
      address: { "@type": "PostalAddress", addressLocality: BIZ.base.name, addressRegion: "KS", addressCountry: "US" }, sameAs: [BIZ.facebook],
      openingHoursSpecification: Object.entries(BIZ.hours).filter(([, h]) => h)
        .map(([d, h]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: days[d], opens: pad(h[0]), closes: pad(h[1]) }))
    };
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  function initReveal() {
    $$("[data-count]").forEach((el) => { el.textContent = el.dataset.count + (el.dataset.suffix || ""); });
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      io.unobserve(el);
      if (el.dataset.count) countUp(el);
      el.classList.remove("pre");
    }), { threshold: 0.15 });
    $$("[data-count]").forEach((el) => io.observe(el));
    // only offset elements that start below the fold, so the page is complete at rest
    if (!reduce) $$(".reveal").forEach((el) => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("pre"); io.observe(el); } });
  }

  function countUp(el) {
    const to = Number(el.dataset.count), suf = el.dataset.suffix || "";
    if (reduce) return;
    let t0 = null;
    const step = (t) => {
      t0 = t0 ?? t;
      const p = Math.min(1, (t - t0) / 1200);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function initTiles() {
    $$("[data-icon]").forEach((el) => { el.innerHTML = ICONS[el.dataset.icon] || ""; });
  }

  // Each page has only some sections; an init runs only when its section is on the page.
  [[null, fillFields], ["#bigPhone", initCopyPhone],
    ["#symptoms", initDiagnoser], ["#svcGrid", initServices], ["#tabFlow", initSizingTools], ["#gallery", initGallery],
    ["#towns", initArea], ["#openPill", initHours], ["#reqForm", initForm], ["#menuBtn", initMenu], ["[data-icon]", initTiles],
    [null, addStructuredData], [null, initReveal]].forEach(([sel, fn]) => {
    if (sel && !$(sel)) return;
    try { fn(); } catch (err) { console.error(`${fn.name} failed:`, err); } // one broken section shouldn't take the rest down
  });
})();
