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
})();
