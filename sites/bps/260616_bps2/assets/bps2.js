/* BP+ × hince composition engine (v2) — shared across all 6 skins.
   Requires GSAP3 + ScrollTrigger + Swiper (CDN, loaded before this).
   hince의 실제 배치(샵 중심) + bps 스타일(테마·모션)을 섞은 구조를 data-attribute로 구동. */
(function () {
  'use strict';
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasSwiper = typeof window.Swiper !== 'undefined';
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    initYear();
    initAnno();
    initTabs();
    initOverlayGNB();
    initHeroSwiper();
    if (!hasGSAP) { showAll(); return; }
    initHeroKinetic();
    initReveals();
    initParallax();
    initPin();
    ScrollTrigger.refresh();
    setTimeout(function () { ScrollTrigger.refresh(); }, 800);
  });

  function showAll() {
    document.querySelectorAll('[data-reveal] [data-stagger], [data-reveal], .kin').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
  }

  /* ---------- Swiper hero (hince식 풀폭 배너 슬라이드) ---------- */
  function initHeroSwiper() {
    if (!hasSwiper) return;
    document.querySelectorAll('.hero-swiper').forEach(function (el) {
      new Swiper(el, {
        loop: true, speed: 900, effect: 'slide',
        autoplay: reduce ? false : { delay: 4200, disableOnInteraction: false },
        pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
        navigation: { nextEl: el.querySelector('.hero-next'), prevEl: el.querySelector('.hero-prev') },
        on: { slideChange: function () { var c = el.querySelector('[data-slide-no]'); if (c) c.textContent = String(this.realIndex + 1).padStart(2, '0'); } }
      });
    });
    // small product/review carousels
    document.querySelectorAll('.mini-swiper').forEach(function (el) {
      new Swiper(el, { loop: true, slidesPerView: 1.2, spaceBetween: 16, speed: 600,
        breakpoints: { 700: { slidesPerView: 3 }, 1100: { slidesPerView: 4 } } });
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
        .to(links, { y: 0, opacity: 1, duration: 0.5, stagger: 0.045, ease: 'power3.out' }, '-=0.25');
    }
    function setOpen(v) {
      open = v; burger.classList.toggle('is-open', v); overlay.classList.toggle('is-open', v);
      document.documentElement.style.overflow = v ? 'hidden' : '';
      burger.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (tl) { v ? tl.play() : tl.reverse(); } else { overlay.style.display = v ? 'flex' : 'none'; }
    }
    burger.addEventListener('click', function () { setOpen(!open); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
    overlay.querySelectorAll('a[href]').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) setOpen(false); });
  }

  /* ---------- kinetic accent (bps 스타일 — 절제된 등장) ---------- */
  function initHeroKinetic() {
    var words = document.querySelectorAll('.kin');
    if (!words.length) return;
    if (reduce) { gsap.set(words, { y: 0, opacity: 1 }); return; }
    gsap.set(words, { yPercent: 115, opacity: 0 });
    gsap.to(words, { yPercent: 0, opacity: 1, duration: 1, ease: 'power4.out', stagger: 0.08, delay: 0.2 });
  }

  /* ---------- reveals + stagger + count-up ---------- */
  function initReveals() {
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      var items = el.querySelectorAll('[data-stagger]');
      var targets = items.length ? items : [el];
      if (reduce) { gsap.set(targets, { opacity: 1, y: 0 }); return; }
      gsap.set(targets, { opacity: 0, y: 40 });
      gsap.to(targets, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', stagger: items.length ? 0.08 : 0,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
    gsap.utils.toArray('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count')) || 0, suffix = el.getAttribute('data-suffix') || '', obj = { v: 0 };
      gsap.to(obj, { v: end, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString() + suffix; } });
    });
  }

  /* ---------- parallax ---------- */
  function initParallax() {
    if (reduce) return;
    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
      var depth = parseFloat(el.getAttribute('data-parallax')) || 0.3;
      var host = el.closest('[data-parallax-host]') || el.parentElement;
      gsap.fromTo(el, { yPercent: -depth * 12 }, { yPercent: depth * 12, ease: 'none',
        scrollTrigger: { trigger: host, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------- pin (hince식 브랜드 스토리 — 핀 + 스텝 전환) ---------- */
  function initPin() {
    var pin = document.querySelector('[data-pin]');
    if (!pin) return;
    var steps = pin.querySelectorAll('.pin-step');
    if (reduce || !steps.length) return;
    var prog = pin.querySelector('[data-pin-progress]');
    gsap.set(steps, { autoAlpha: 0, y: 36 });
    gsap.set(steps[0], { autoAlpha: 1, y: 0 });
    var tl = gsap.timeline({ scrollTrigger: { trigger: pin, start: 'top top', end: '+=' + (steps.length * 520), pin: true, scrub: 0.6,
      onUpdate: function (self) { if (prog) prog.style.transform = 'scaleX(' + self.progress + ')'; } } });
    steps.forEach(function (s, i) { if (i === 0) return;
      tl.to(steps[i - 1], { autoAlpha: 0, y: -36, duration: 0.4 }).to(s, { autoAlpha: 1, y: 0, duration: 0.4 }, '<0.1'); });
  }

  /* ---------- category tabs ---------- */
  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (root) {
      var btns = root.querySelectorAll('[data-tab]'), panels = root.querySelectorAll('[data-panel]');
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-tab');
          btns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
          panels.forEach(function (p) {
            var on = p.getAttribute('data-panel') === key; p.classList.toggle('is-active', on);
            if (on && hasGSAP && !reduce) { var c = p.querySelectorAll('[data-stagger]');
              gsap.fromTo(c.length ? c : [p], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }); }
          });
        });
      });
    });
  }
  function initAnno() { var x = document.querySelector('[data-anno-close]'); if (x) x.addEventListener('click', function () { var a = x.closest('.anno'); if (a) a.style.display = 'none'; }); }
  function initYear() { document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); }); }
})();
