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

    // A breaking wave that sloshes side to side: it pops up where the last
    // wave crashed, rolls across, curls into a plunging lip, and collapses
    // forward — then the next wave rises on the far side. The silhouette is
    // built from bezier control points morphed from a swell to a full curl.
    var WATER = 0.90;      // waterline (fraction of hero height)
    var BASE_WH = 0.56;    // wave height (fraction of hero height)
    var BASE_BW = 0.42;    // wave width scale (fraction of hero width)
    var ripples = [];
    var MAXP = 460;
    var CYCLE = 6000;      // ms per crash — alternates sides, full slosh ~12s
    var lastCycle = -1, crashed = false, dir = 1;

    // gentle base chop behind the big wave
    var CHOP = [
      { base: 0.88, amp: 8, len: 0.0016, spd: 0.004, col: TEAL_DIM, a: 0.08, k2: 0.0030, s2: 0.006 },
      { base: 0.91, amp: 6, len: 0.0021, spd: 0.006, col: TEAL,     a: 0.10, k2: 0.0040, s2: 0.009 }
    ];

    function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
    function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    function chopY(L, x, t) { return H * L.base - Math.sin(x * L.len + t * L.spd) * L.amp - Math.sin(x * L.k2 + t * L.s2) * L.amp * 0.4; }

    // Wave silhouette control points (x in half-widths, y in heights, crest at
    // 0, waterline at 1). Morphed from SWELL to CURL by the curl amount.
    var SWELL = [[-0.75, 1.0], [-0.58, 0.34], [-0.22, 0.02], [0, 0], [0.05, 0.14], [0.12, 0.34], [0.14, 0.5], [0.16, 0.66], [0.30, 0.86], [0.40, 1.0]];
    var CURL  = [[-0.75, 1.0], [-0.58, 0.30], [-0.22, 0.0],  [0, 0], [0.03, 0.16], [0.10, 0.42], [0.07, 0.62], [0.02, 0.92], [0.32, 0.80], [0.52, 1.0]];

    // Broad splash where the wave collapses — thrown forward in the travel
    // direction (not straight up), tallest near the impact point.
    function bigSplash(cx, y, spread, sdir) {
      var n = 150 + Math.floor(Math.random() * 70);
      for (var i = 0; i < n && particles.length < MAXP; i++) {
        var ox = (Math.random() - 0.5) * spread;
        var up = 1.1 + Math.random() * 3.0 - Math.abs(ox) / spread * 1.1;
        particles.push({
          x: cx + ox, y: y,
          vx: sdir * (0.8 + Math.random() * 2.6) + ox * 0.008, // thrown forward
          vy: -Math.max(0.3, up),
          life: 1, decay: 0.008 + Math.random() * 0.010,
          r: 0.9 + Math.random() * 3.0, grav: 0.15 + Math.random() * 0.06
        });
      }
      ripples.push({ x: cx, y: y, r: 12, life: 1, w: spread });
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      var cyc = Math.floor(t / CYCLE);
      var ph = (t % CYCLE) / CYCLE;
      if (cyc !== lastCycle) { lastCycle = cyc; crashed = false; }
      var step = Math.max(6, W / 260);

      // --- base chop ---
      for (var i = 0; i < CHOP.length; i++) {
        var L = CHOP[i];
        ctx.beginPath(); ctx.moveTo(0, H);
        for (var x = 0; x <= W + step; x += step) {
          var y = chopY(L, x, t);
          x === 0 ? ctx.lineTo(0, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.closePath();
        var g = ctx.createLinearGradient(0, H * L.base - L.amp, 0, H);
        g.addColorStop(0, rgba(L.col, L.a)); g.addColorStop(1, rgba(L.col, L.a * 0.2));
        ctx.fillStyle = g; ctx.fill();
      }

      // --- choreography: pop up at riseX, roll to crashX, curl, collapse ---
      var even = (cyc % 2 === 0);
      dir = even ? 1 : -1;
      var riseX = even ? 0.20 : 0.80, crashX = even ? 0.80 : 0.20;
      var travel = easeInOut(clamp01(ph / 0.60));
      var curl = clamp01((ph - 0.15) / 0.42);                          // crest hooks into a lip
      var kollapse = ph < 0.70 ? 0 : easeInOut(clamp01((ph - 0.70) / 0.22)); // lip plunges, wave subsides
      var popup = ph < 0.15 ? easeOut(ph / 0.15) : 1;
      var hs = popup * (1 - kollapse * 0.85);
      var cx = (riseX + (crashX - riseX) * travel) * W + dir * kollapse * 0.05 * W;
      var baseYw = H * WATER, BW = BASE_BW * W, WH = BASE_WH * H * hs, peakY = baseYw - WH;

      if (WH > 3) {
        var Xf = function (f) { return cx + dir * f * BW; };
        var Yf = function (f) { return peakY + f * WH; };
        var B = [];
        for (var bi = 0; bi < SWELL.length; bi++) {
          B.push([SWELL[bi][0] + (CURL[bi][0] - SWELL[bi][0]) * curl,
                  SWELL[bi][1] + (CURL[bi][1] - SWELL[bi][1]) * curl]);
        }
        // wave body
        ctx.beginPath();
        ctx.moveTo(dir > 0 ? 0 : W, H);
        ctx.lineTo(Xf(B[0][0]), Yf(B[0][1]));
        ctx.bezierCurveTo(Xf(B[1][0]), Yf(B[1][1]), Xf(B[2][0]), Yf(B[2][1]), Xf(B[3][0]), Yf(B[3][1]));
        ctx.bezierCurveTo(Xf(B[4][0]), Yf(B[4][1]), Xf(B[5][0]), Yf(B[5][1]), Xf(B[6][0]), Yf(B[6][1]));
        ctx.bezierCurveTo(Xf(B[7][0]), Yf(B[7][1]), Xf(B[8][0]), Yf(B[8][1]), Xf(B[9][0]), Yf(B[9][1]));
        ctx.lineTo(dir > 0 ? W : 0, H); ctx.closePath();
        var gw = ctx.createLinearGradient(0, peakY, 0, baseYw);
        gw.addColorStop(0, rgba(TEAL_BRIGHT, 0.30));
        gw.addColorStop(0.5, rgba(TEAL, 0.20));
        gw.addColorStop(1, rgba(TEAL_DIM, 0.08));
        ctx.fillStyle = gw; ctx.fill();

        // foam highlight tracing the breaking crest edge (no filled lip blob)
        if (curl > 0.02) {
          ctx.beginPath();
          ctx.moveTo(Xf(B[3][0]), Yf(B[3][1]));
          ctx.bezierCurveTo(Xf(B[4][0]), Yf(B[4][1]), Xf(B[5][0]), Yf(B[5][1]), Xf(B[6][0]), Yf(B[6][1]));
          ctx.strokeStyle = rgba(FOAM, (0.28 + curl * 0.38) * (1 - kollapse * 0.5));
          ctx.lineWidth = 1.4 + curl * 2.2; ctx.stroke();
          // foam spray shedding off the crest as it breaks and topples forward
          var tipX = Xf(B[3][0]), tipY = Yf(B[3][1]);
          if (particles.length < MAXP && Math.random() < 0.35 + kollapse * 0.4) {
            particles.push({ x: tipX + dir * curl * 30 + (Math.random() - 0.5) * 24, y: tipY,
              vx: dir * (0.6 + Math.random() * 1.8),
              vy: -(0.3 + Math.random() * 1.0) + kollapse * (0.5 + Math.random() * 0.9),
              life: 1, decay: 0.012 + Math.random() * 0.01, r: 0.7 + Math.random() * 1.8, grav: 0.16 });
          }
        }
      }

      // the crash: one broad splash where the wave meets the far side
      if (!crashed && ph >= 0.70) { crashed = true; bigSplash(crashX * W, H * WATER - 2, 0.5 * W, dir); }

      // --- spray particles ---
      for (var p = particles.length - 1; p >= 0; p--) {
        var P = particles[p];
        P.x += P.vx; P.y += P.vy; P.vy += (P.grav || 0.15); P.vx *= 0.985; // air drag
        P.life -= P.decay;
        if (P.life <= 0 || P.y > H) { particles.splice(p, 1); continue; }
        ctx.beginPath(); ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(FOAM, Math.max(0, P.life) * 0.55);
        ctx.fill();
      }

      // --- expanding foam ring where it broke ---
      for (var r0 = ripples.length - 1; r0 >= 0; r0--) {
        var R = ripples[r0];
        R.r += 2.2; R.life -= 0.018;
        if (R.life <= 0) { ripples.splice(r0, 1); continue; }
        var rr = Math.min(R.r, (R.w || W));
        ctx.beginPath();
        ctx.ellipse(R.x, R.y, rr, rr * 0.22, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(FOAM, Math.max(0, R.life) * 0.13);
        ctx.lineWidth = 1.2; ctx.stroke();
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
