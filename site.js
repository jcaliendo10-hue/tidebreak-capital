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

    // Layered swells, back (deep/faint) to front (the breaker)
    var LAYERS = [
      { base: 0.62, amp: 18, len: 0.0016, spd: 0.006, col: TEAL_DIM,    a: 0.10, k2: 0.0037, s2: 0.011 },
      { base: 0.70, amp: 24, len: 0.0012, spd: 0.010, col: TEAL,        a: 0.12, k2: 0.0029, s2: 0.015 },
      { base: 0.80, amp: 30, len: 0.0009, spd: 0.016, col: TEAL,        a: 0.16, k2: 0.0022, s2: 0.020 },
      { base: 0.90, amp: 34, len: 0.0007, spd: 0.024, col: TEAL_BRIGHT, a: 0.20, k2: 0.0018, s2: 0.026, breaker: true }
    ];

    function crest(layer, x, t) {
      return H * layer.base
        - Math.sin(x * layer.len + t * layer.spd) * layer.amp
        - Math.sin(x * layer.k2 + t * layer.s2) * layer.amp * 0.4;
    }

    function spawnFoam(x, y, t) {
      var speed = 0.6 + Math.random() * 1.6;
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
      particles.push({
        x: x, y: y,
        vx: Math.cos(ang) * speed + (Math.random() - 0.5) * 0.6,
        vy: Math.sin(ang) * speed - (0.4 + Math.random() * 0.9),
        life: 1, decay: 0.008 + Math.random() * 0.012,
        r: 0.7 + Math.random() * 2.1
      });
    }

    var MAXP = 220;
    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < LAYERS.length; i++) {
        var L = LAYERS[i];
        ctx.beginPath();
        ctx.moveTo(0, H);
        var step = Math.max(6, W / 220), prevY = 0;
        for (var x = 0; x <= W + step; x += step) {
          var y = crest(L, x, t);
          if (x === 0) ctx.lineTo(0, y);
          else ctx.lineTo(x, y);
          prevY = y;
          // Breaking crest sheds foam where the swell steepens
          if (L.breaker && Math.random() < 0.06 && particles.length < MAXP) {
            spawnFoam(x, y, t);
          }
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        var g = ctx.createLinearGradient(0, H * L.base - L.amp, 0, H);
        g.addColorStop(0, rgba(L.col, L.a));
        g.addColorStop(1, rgba(L.col, L.a * 0.15));
        ctx.fillStyle = g;
        ctx.fill();

        // Foam highlight line along the breaking crest
        if (L.breaker) {
          ctx.beginPath();
          for (var x2 = 0; x2 <= W; x2 += step) {
            var yc = crest(L, x2, t) + (Math.random() - 0.5) * 1.4;
            if (x2 === 0) ctx.moveTo(0, yc); else ctx.lineTo(x2, yc);
          }
          ctx.strokeStyle = rgba(FOAM, 0.14);
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      // Spray particles
      for (var p = particles.length - 1; p >= 0; p--) {
        var P = particles[p];
        P.x += P.vx; P.y += P.vy; P.vy += 0.045; // gravity
        P.life -= P.decay;
        if (P.life <= 0 || P.y > H) { particles.splice(p, 1); continue; }
        ctx.beginPath();
        ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(FOAM, Math.max(0, P.life) * 0.5);
        ctx.fill();
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
