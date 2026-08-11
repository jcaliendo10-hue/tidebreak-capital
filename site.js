/* Tidebreak Capital — shared interactions */
(function () {
  "use strict";

  // Mobile nav toggle
  var toggle = document.querySelector(".navtoggle");
  var links = document.querySelector(".navlinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); });
    });
  }

  // Scroll reveal
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // Count-up stat numbers (data-count = target, optional data-suffix / data-prefix)
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var prefix = el.getAttribute("data-prefix") || "";
    var decimals = (el.getAttribute("data-decimals")) ? parseInt(el.getAttribute("data-decimals"), 10) : 0;
    var dur = 1400, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = (target * eased).toFixed(decimals);
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (reduce || !("IntersectionObserver" in window)) {
    counters.forEach(function (el) {
      el.textContent = (el.getAttribute("data-prefix") || "") + el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
    });
  } else {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); io2.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { io2.observe(el); });
  }

  // Contact form — front-end only, no backend
  var form = document.querySelector("#lpform");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var ok = document.querySelector("#formok");
      form.style.display = "none";
      if (ok) ok.style.display = "block";
    });
  }

  // Footer year
  var y = document.querySelector("#yr");
  if (y) y.textContent = new Date().getFullYear();

  /* =========================================================
     Premium visual layer — grain, scroll progress, condensing
     nav, cursor spotlight on cards, and hero light/parallax.
     All additive and reduced-motion aware.
     ========================================================= */

  // Grain overlay (skipped under reduced motion via CSS display:none)
  var grain = document.createElement("div");
  grain.className = "grain";
  document.body.appendChild(grain);

  // Scroll progress hairline
  var bar = document.createElement("div");
  bar.className = "scrollbar";
  document.body.appendChild(bar);

  var nav = document.querySelector("nav.site");
  var hero = document.querySelector(".hero");
  var glow = null, wavefield = null;

  // Inject hero light-source glow + volumetric shafts
  if (hero) {
    var shafts = document.createElement("div");
    shafts.className = "shafts";
    glow = document.createElement("div");
    glow.className = "glow";
    hero.insertBefore(shafts, hero.firstChild);
    hero.insertBefore(glow, hero.firstChild);
    wavefield = hero.querySelector(".wavefield");
  }

  // Mark shared card surfaces as spotlight targets
  var cards = document.querySelectorAll(".stat,.pillar,.fcard,.member,.insight,.ent");
  cards.forEach(function (c) {
    c.classList.add("spot");
    c.addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px");
      c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  var docEl = document.documentElement;
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var st = window.pageYOffset || docEl.scrollTop;
      // progress bar
      var h = docEl.scrollHeight - docEl.clientHeight;
      bar.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
      // condensing nav
      if (nav) nav.classList.toggle("scrolled", st > 24);
      // hero parallax (only while hero is in view)
      if (wavefield && !reduce && st < window.innerHeight) {
        wavefield.style.transform = "translateY(" + (st * 0.18) + "px)";
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Hero glow follows the cursor for a soft parallax light
  if (hero && glow && !reduce) {
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      glow.style.setProperty("--gx", (dx * 60) + "px");
      glow.style.setProperty("--gy", (dy * 40) + "px");
    });
  }

  /* =========================================================
     Hero "crashing whitewater" — procedural canvas animation.
     Palette-matched layered swells with foam/spray particles
     shed off the breaking crest. Self-contained, no assets.
     ========================================================= */
  var canvas = hero ? hero.querySelector(".herowaves-canvas") : null;
  var wavesWrap = hero ? hero.querySelector(".herowaves") : null;
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, DPR = 1;
    var particles = [];
    var running = true, booted = false;

    // Brand palette
    var TEAL = [121, 176, 168], TEAL_DIM = [79, 125, 120], TEAL_BRIGHT = [143, 199, 189];
    var FOAM = [214, 240, 235];

    function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth || window.innerWidth;
      H = hero.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(W * DPR));
      canvas.height = Math.max(1, Math.round(H * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    // Ambient swells (slow, calm) sit behind one breaker that
    // builds up, crashes, throws a splash, then settles — on a cycle.
    var SWELLS = [
      { base: 0.66, amp: 12, len: 0.0015, spd: 0.0040, col: TEAL_DIM, a: 0.09, k2: 0.0031, s2: 0.0070 },
      { base: 0.76, amp: 16, len: 0.0011, spd: 0.0060, col: TEAL,     a: 0.12, k2: 0.0024, s2: 0.0100 }
    ];
    var BR = { base: 0.86, len: 0.0009, spd: 0.010, col: TEAL_BRIGHT, k2: 0.0016, s2: 0.014 };

    var ripples = [];
    var MAXP = 320;
    var CYCLE = 7000;                 // ms per wave — slow
    var lastCycle = -1, crashed = false, breakX = 0.6;

    function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
    function pick(seed) { var x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }

    // Energy curve across a cycle: slow build to a peak, sharp crash, calm.
    function energy(ph) {
      if (ph < 0.72) return easeInOut(ph / 0.72);   // build
      if (ph < 0.82) return 1 - (ph - 0.72) / 0.10; // crash (drop to 0)
      return 0;                                      // calm
    }

    function crestOf(base, amp, len, spd, k2, s2, x, t) {
      return H * base - Math.sin(x * len + t * spd) * amp - Math.sin(x * k2 + t * s2) * amp * 0.4;
    }

    // Burst of foam thrown up when the wave breaks — arcs up ~150px then falls.
    function splash(x, y) {
      var n = 80 + Math.floor(Math.random() * 45);
      for (var i = 0; i < n && particles.length < MAXP; i++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.7);
        var sp = 1.2 + Math.random() * 3.2;
        particles.push({
          x: x + (Math.random() - 0.5) * 30, y: y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp * 0.9 - (0.8 + Math.random() * 1.9),
          life: 1, decay: 0.010 + Math.random() * 0.012,
          r: 0.8 + Math.random() * 2.5, grav: 0.15 + Math.random() * 0.06
        });
      }
      ripples.push({ x: x, y: y, r: 6, life: 1 });
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      var cyc = Math.floor(t / CYCLE);
      var ph = (t % CYCLE) / CYCLE;
      if (cyc !== lastCycle) { lastCycle = cyc; crashed = false; breakX = 0.42 + pick(cyc + 1) * 0.36; }
      var e = energy(ph);
      var step = Math.max(6, W / 240);

      // --- ambient swells ---
      for (var i = 0; i < SWELLS.length; i++) {
        var L = SWELLS[i];
        ctx.beginPath(); ctx.moveTo(0, H);
        for (var x = 0; x <= W + step; x += step) {
          var y = crestOf(L.base, L.amp, L.len, L.spd, L.k2, L.s2, x, t);
          x === 0 ? ctx.lineTo(0, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.closePath();
        var g = ctx.createLinearGradient(0, H * L.base - L.amp, 0, H);
        g.addColorStop(0, rgba(L.col, L.a)); g.addColorStop(1, rgba(L.col, L.a * 0.15));
        ctx.fillStyle = g; ctx.fill();
      }

      // --- breaker: rises with energy, crashes at the peak ---
      var brAmp = 14 + e * 34;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var xb = 0; xb <= W + step; xb += step) {
        var yb = crestOf(BR.base, brAmp, BR.len, BR.spd, BR.k2, BR.s2, xb, t);
        xb === 0 ? ctx.lineTo(0, yb) : ctx.lineTo(xb, yb);
      }
      ctx.lineTo(W, H); ctx.closePath();
      var gb = ctx.createLinearGradient(0, H * BR.base - brAmp, 0, H);
      gb.addColorStop(0, rgba(BR.col, 0.14 + e * 0.12));
      gb.addColorStop(1, rgba(BR.col, 0.03));
      ctx.fillStyle = gb; ctx.fill();

      // foam line on the crest, brightening as it peaks
      ctx.beginPath();
      for (var xf = 0; xf <= W; xf += step) {
        var yf = crestOf(BR.base, brAmp, BR.len, BR.spd, BR.k2, BR.s2, xf, t) + (Math.random() - 0.5) * 1.6;
        xf === 0 ? ctx.moveTo(0, yf) : ctx.lineTo(xf, yf);
      }
      ctx.strokeStyle = rgba(FOAM, 0.06 + e * 0.16);
      ctx.lineWidth = 1.3; ctx.stroke();

      // pre-crash droplets near the swelling crest, then the crash splash
      var bx = breakX * W;
      var by = crestOf(BR.base, brAmp, BR.len, BR.spd, BR.k2, BR.s2, bx, t);
      if (e > 0.5 && Math.random() < (e - 0.5) * 0.5 && particles.length < MAXP) {
        particles.push({ x: bx + (Math.random() - 0.5) * 60, y: by,
          vx: (Math.random() - 0.5) * 1.2, vy: -(0.6 + Math.random() * 1.2),
          life: 1, decay: 0.02 + Math.random() * 0.02, r: 0.6 + Math.random() * 1.4, grav: 0.15 });
      }
      if (!crashed && ph >= 0.72) { crashed = true; splash(bx, by); }

      // --- spray particles ---
      for (var p = particles.length - 1; p >= 0; p--) {
        var P = particles[p];
        P.x += P.vx; P.y += P.vy; P.vy += (P.grav || 0.05);
        P.life -= P.decay;
        if (P.life <= 0 || P.y > H) { particles.splice(p, 1); continue; }
        ctx.beginPath(); ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(FOAM, Math.max(0, P.life) * 0.55);
        ctx.fill();
      }

      // --- expanding foam ring where it broke ---
      for (var r0 = ripples.length - 1; r0 >= 0; r0--) {
        var R = ripples[r0];
        R.r += 1.4; R.life -= 0.02;
        if (R.life <= 0) { ripples.splice(r0, 1); continue; }
        ctx.beginPath();
        ctx.ellipse(R.x, R.y, R.r, R.r * 0.32, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(FOAM, Math.max(0, R.life) * 0.14);
        ctx.lineWidth = 1.1; ctx.stroke();
      }

      if (!booted && wavesWrap) { wavesWrap.classList.add("on"); booted = true; }
      rafId = requestAnimationFrame(frame);
    }

    var rafId = null;
    function start() { if (!rafId) rafId = requestAnimationFrame(frame); }
    function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("load", resize); // re-measure once layout is final

    if (reduce) {
      // Single static frame, no animation
      running = true; frame(1000); running = false; stop();
    } else {
      start();
      // Pause while the hero is scrolled off-screen or the tab is hidden
      window.addEventListener("scroll", function () {
        var off = (window.pageYOffset || docEl.scrollTop) > window.innerHeight;
        if (off) { running = false; stop(); }
        else if (!document.hidden) { running = true; start(); }
      }, { passive: true });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) { running = false; stop(); }
        else if ((window.pageYOffset || docEl.scrollTop) <= window.innerHeight) { running = true; start(); }
      });
    }
  }
})();
