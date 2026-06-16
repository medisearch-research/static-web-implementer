/* BP+ × hince engine v5.2 — hince-faithful. GSAP3 + ScrollTrigger + Swiper (CDN).
   NO pin (req1), NO marquee (req2). Reveal-driven editorial motion + hover dim (alpha token). */
(function () {
  'use strict';
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasSwiper = typeof window.Swiper !== 'undefined';
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    initYear(); initAnno(); initTabs(); initOverlayGNB(); initHeroSwiper();
    initGauge(); initShopFilter(); initSort(); initGallery(); initQty(); initContactForm();
    if (!hasGSAP) { showAll(); return; }
    initHeroKinetic(); initReveals(); initParallax();
    ScrollTrigger.refresh(); setTimeout(function () { ScrollTrigger.refresh(); }, 700);
  });

  function showAll() { document.querySelectorAll('[data-reveal] [data-stagger], [data-reveal], .kin').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; }); }

  function initHeroSwiper() {
    if (!hasSwiper) return;
    document.querySelectorAll('.hero-swiper').forEach(function (el) {
      new Swiper(el, { loop: true, speed: 1000, effect: 'fade', fadeEffect: { crossFade: true },
        autoplay: reduce ? false : { delay: 5200, disableOnInteraction: false },
        pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
        navigation: { nextEl: el.querySelector('.s-next'), prevEl: el.querySelector('.s-prev') },
        on: { slideChange: function () { var c = el.querySelector('[data-slide-no]'); if (c) c.textContent = String(this.realIndex + 1).padStart(2, '0'); } } });
    });
    document.querySelectorAll('.mini-swiper').forEach(function (el) { new Swiper(el, { loop: true, slidesPerView: 1.2, spaceBetween: 16, speed: 600, breakpoints: { 700: { slidesPerView: 2.3 }, 1100: { slidesPerView: 4 } } }); });
  }

  /* VIEW MORE gauge → navigate (hince-style fill) */
  function initGauge() {
    document.querySelectorAll('[data-gauge]').forEach(function (el) {
      var href = el.getAttribute('data-href') || el.getAttribute('href');
      var fill = el.querySelector('.gauge-fill'); var filling = false;
      el.addEventListener('mouseenter', function () { if (fill && !filling) fill.style.transform = 'scaleX(.45)'; });
      el.addEventListener('mouseleave', function () { if (fill && !filling) fill.style.transform = 'scaleX(0)'; });
      el.addEventListener('click', function (e) {
        e.preventDefault(); if (filling) return; filling = true;
        el.classList.add('is-filling'); if (fill) fill.style.transform = 'scaleX(1)';
        setTimeout(function () { if (href) location.href = href; }, 620);
      });
    });
  }

  /* fullscreen overlay GNB — hince signature */
  function initOverlayGNB() {
    var burger = document.querySelector('[data-gnb-toggle]'); var overlay = document.querySelector('[data-gnb]');
    if (!burger || !overlay) return;
    var links = overlay.querySelectorAll('[data-gnb-link]'); var closeBtn = overlay.querySelector('[data-gnb-close]');
    var open = false, tl = null;
    if (hasGSAP) {
      gsap.set(overlay, { yPercent: -100, display: 'flex' }); gsap.set(links, { y: 40, opacity: 0 });
      tl = gsap.timeline({ paused: true }).to(overlay, { yPercent: 0, duration: 0.62, ease: 'power4.inOut' }).to(links, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, '-=0.22');
    }
    function set(v) { open = v; burger.classList.toggle('is-open', v); overlay.classList.toggle('is-open', v); document.documentElement.style.overflow = v ? 'hidden' : ''; burger.setAttribute('aria-expanded', v ? 'true' : 'false'); if (tl) { v ? tl.play() : tl.reverse(); } else { overlay.style.display = v ? 'flex' : 'none'; } }
    burger.addEventListener('click', function () { set(!open); });
    if (closeBtn) closeBtn.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) set(false); });
  }

  function initHeroKinetic() {
    var w = document.querySelectorAll('.kin'); if (!w.length) return;
    if (reduce) { gsap.set(w, { y: 0, opacity: 1 }); return; }
    gsap.set(w, { yPercent: 115, opacity: 0 }); gsap.to(w, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'power4.out', stagger: 0.09, delay: 0.25 });
  }

  /* scroll reveals + counters (hince "scroll reveals content") */
  function initReveals() {
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      var items = el.querySelectorAll('[data-stagger]'); var t = items.length ? items : [el];
      if (reduce) { gsap.set(t, { opacity: 1, y: 0 }); return; }
      gsap.set(t, { opacity: 0, y: 44 });
      gsap.to(t, { opacity: 1, y: 0, duration: 0.95, ease: 'power3.out', stagger: items.length ? 0.09 : 0, scrollTrigger: { trigger: el, start: 'top 87%', once: true } });
    });
    gsap.utils.toArray('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count')) || 0, suf = el.getAttribute('data-suffix') || '', o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.9, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true }, onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString() + suf; } });
    });
  }

  function initParallax() {
    if (reduce) return;
    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
      var d = parseFloat(el.getAttribute('data-parallax')) || 0.3; var host = el.closest('[data-parallax-host]') || el.parentElement;
      gsap.fromTo(el, { yPercent: -d * 9 }, { yPercent: d * 9, ease: 'none', scrollTrigger: { trigger: host, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (root) {
      var btns = root.querySelectorAll('[data-tab]'), panels = root.querySelectorAll('[data-panel]');
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var k = btn.getAttribute('data-tab'); btns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
          panels.forEach(function (p) { var on = p.getAttribute('data-panel') === k; p.classList.toggle('is-active', on);
            if (on && hasGSAP && !reduce) { var c = p.querySelectorAll('[data-stagger]'); gsap.fromTo(c.length ? c : [p], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }); } });
        });
      });
    });
  }

  function initShopFilter() {
    var root = document.querySelector('[data-shopfilter]'); if (!root) return;
    var btns = root.querySelectorAll('[data-cat]'); var cards = document.querySelectorAll('[data-prodcat]');
    var count = document.querySelector('[data-prodcount]');
    function apply(cat) {
      var n = 0;
      cards.forEach(function (c) { var on = cat === 'all' || c.getAttribute('data-prodcat') === cat; c.style.display = on ? '' : 'none'; if (on) n++; });
      if (count) count.textContent = n;
      if (hasGSAP && !reduce) { var vis = [].slice.call(cards).filter(function (c) { return c.style.display !== 'none'; }); gsap.fromTo(vis, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.04 }); }
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { btns.forEach(function (x) { x.classList.toggle('is-active', x === b); }); apply(b.getAttribute('data-cat')); }); });
  }

  function initSort() {
    var sel = document.querySelector('[data-sort]'); if (!sel) return;
    var grid = document.querySelector('[data-grid]'); if (!grid) return;
    sel.addEventListener('change', function () {
      var cards = [].slice.call(grid.querySelectorAll('[data-prodcat]')); var key = sel.value;
      cards.sort(function (a, b) {
        if (key === 'low') return (+a.dataset.price) - (+b.dataset.price);
        if (key === 'high') return (+b.dataset.price) - (+a.dataset.price);
        if (key === 'review') return (+b.dataset.review) - (+a.dataset.review);
        return (+a.dataset.idx) - (+b.dataset.idx);
      });
      cards.forEach(function (c) { grid.appendChild(c); });
      if (hasGSAP && !reduce) gsap.fromTo(cards, { opacity: 0.3 }, { opacity: 1, duration: 0.4, stagger: 0.02 });
    });
  }

  function initGallery() {
    document.querySelectorAll('[data-gallery]').forEach(function (g) {
      var main = g.querySelector('[data-gallery-main] img'); var thumbs = g.querySelectorAll('[data-gallery-thumb]');
      thumbs.forEach(function (t) { t.addEventListener('click', function () { thumbs.forEach(function (x) { x.classList.toggle('is-active', x === t); }); if (main) { main.style.opacity = 0; setTimeout(function () { main.src = t.querySelector('img').src; main.style.opacity = 1; }, 150); } }); });
    });
  }

  function initQty() {
    document.querySelectorAll('[data-qty]').forEach(function (w) {
      var inp = w.querySelector('input'); var dec = w.querySelector('[data-qty-dec]'); var inc = w.querySelector('[data-qty-inc]');
      if (dec) dec.addEventListener('click', function () { inp.value = Math.max(1, (+inp.value || 1) - 1); });
      if (inc) inc.addEventListener('click', function () { inp.value = (+inp.value || 1) + 1; });
    });
  }

  /* 제휴문의 inquiry form */
  function initContactForm() {
    document.querySelectorAll('[data-inquiry]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('[type=submit]'); var done = form.querySelector('[data-inquiry-done]');
        if (btn) { btn.disabled = true; btn.textContent = '전송 중…'; }
        setTimeout(function () {
          form.querySelectorAll('input,textarea,select').forEach(function (f) { if (f.type !== 'submit') f.disabled = true; });
          if (done) { done.style.display = 'block'; if (hasGSAP) gsap.fromTo(done, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }); }
          if (btn) btn.textContent = '문의가 접수되었습니다 ✓';
        }, 650);
      });
    });
  }

  function initAnno() { var x = document.querySelector('[data-anno-close]'); if (x) x.addEventListener('click', function () { var a = x.closest('.anno'); if (a) a.style.display = 'none'; }); }
  function initYear() { document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); }); }
})();
