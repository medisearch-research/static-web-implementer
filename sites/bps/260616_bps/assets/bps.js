/* BP+ × hince-style engine — shared across all 6 skins.
   Requires GSAP 3 + ScrollTrigger (loaded via CDN before this file).
   Everything is wired through data-attributes so each skin only ships markup + theme. */
(function () {
  'use strict';
  var hasGSAP = typeof window.gsap !== 'undefined';
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    initYear();
    initTabs();
    initOverlayGNB();
    if (!hasGSAP) { showAll(); return; }
    initHeroKinetic();
    initReveals();
    initParallax();
    initPin();
    ScrollTrigger.refresh();
  });

  /* ---------- fallback: if GSAP missing, reveal everything ---------- */
  function showAll() {
    document.querySelectorAll('[data-reveal] [data-stagger], [data-reveal], .hero-word').forEach(function (el) {
      el.style.opacity = 1; el.style.transform = 'none';
    });
  }

  /* ---------- 4. Fullscreen overlay GNB (GSAP timeline) ---------- */
  function initOverlayGNB() {
    var burger = document.querySelector('[data-gnb-toggle]');
    var overlay = document.querySelector('[data-gnb]');
    if (!burger || !overlay) return;
    var links = overlay.querySelectorAll('[data-gnb-link]');
    var closeBtn = overlay.querySelector('[data-gnb-close]');
    var open = false, tl = null;

    if (hasGSAP) {
      gsap.set(overlay, { yPercent: -100, display: 'flex' });
      gsap.set(links, { y: 40, opacity: 0 });
      tl = gsap.timeline({ paused: true })
        .to(overlay, { yPercent: 0, duration: 0.62, ease: 'power4.inOut' })
        .to(links, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, '-=0.25');
    }
    function setOpen(v) {
      open = v;
      burger.classList.toggle('is-open', v);
      overlay.classList.toggle('is-open', v);
      document.documentElement.style.overflow = v ? 'hidden' : '';
      burger.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (tl) { v ? tl.play() : tl.reverse(); }
      else { overlay.style.display = v ? 'flex' : 'none'; }
    }
    burger.addEventListener('click', function () { setOpen(!open); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
    overlay.querySelectorAll('a[href]').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) setOpen(false); });
  }

  /* ---------- 3a. Hero kinetic type (stagger) ---------- */
  function initHeroKinetic() {
    var words = document.querySelectorAll('.hero-word');
    if (!words.length) return;
    if (reduce) { gsap.set(words, { y: 0, opacity: 1 }); return; }
    gsap.set(words, { yPercent: 120, opacity: 0 });
    gsap.to(words, { yPercent: 0, opacity: 1, duration: 1.05, ease: 'power4.out', stagger: 0.09, delay: 0.15 });
    // subtle hero background parallax handled in initParallax via [data-parallax]
  }

  /* ---------- 3b. Scroll reveals + stagger ---------- */
  function initReveals() {
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      var items = el.querySelectorAll('[data-stagger]');
      var targets = items.length ? items : [el];
      if (reduce) { gsap.set(targets, { opacity: 1, y: 0 }); return; }
      gsap.set(targets, { opacity: 0, y: 44 });
      gsap.to(targets, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        stagger: items.length ? 0.09 : 0,
        scrollTrigger: { trigger: el, start: 'top 84%', once: true }
      });
    });
    // count-up numbers
    gsap.utils.toArray('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString() + suffix; }
      });
    });
  }

  /* ---------- 3c. Parallax ---------- */
  function initParallax() {
    if (reduce) return;
    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
      var depth = parseFloat(el.getAttribute('data-parallax')) || 0.3;
      var host = el.closest('[data-parallax-host]') || el.parentElement;
      gsap.fromTo(el, { yPercent: -depth * 12 },
        { yPercent: depth * 12, ease: 'none',
          scrollTrigger: { trigger: host, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------- 3d. Pin (ScrollTrigger pin + scrub stepped reveal) ---------- */
  function initPin() {
    var pin = document.querySelector('[data-pin]');
    if (!pin) return;
    var steps = pin.querySelectorAll('.pin-step');
    if (reduce || !steps.length) return;
    var prog = pin.querySelector('[data-pin-progress]');
    gsap.set(steps, { autoAlpha: 0, y: 40 });
    gsap.set(steps[0], { autoAlpha: 1, y: 0 });
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin, start: 'top top', end: '+=' + (steps.length * 520),
        pin: true, scrub: 0.6,
        onUpdate: function (self) { if (prog) prog.style.transform = 'scaleX(' + self.progress + ')'; }
      }
    });
    steps.forEach(function (s, i) {
      if (i === 0) return;
      tl.to(steps[i - 1], { autoAlpha: 0, y: -40, duration: 0.4 })
        .to(s, { autoAlpha: 1, y: 0, duration: 0.4 }, '<0.1');
    });
  }

  /* ---------- category tabs ---------- */
  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (root) {
      var btns = root.querySelectorAll('[data-tab]');
      var panels = root.querySelectorAll('[data-panel]');
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-tab');
          btns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
          panels.forEach(function (p) {
            var on = p.getAttribute('data-panel') === key;
            p.classList.toggle('is-active', on);
            if (on && hasGSAP && !reduce) {
              var cards = p.querySelectorAll('[data-stagger]');
              gsap.fromTo(cards.length ? cards : [p], { opacity: 0, y: 28 },
                { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 });
            }
          });
        });
      });
    });
  }

  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }
})();
