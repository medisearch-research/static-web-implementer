/* BP+ FUSION — interactions. Products from window.BP_PRODUCTS (assets/products.js) */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const P = window.BP_PRODUCTS || [];
  const won = (p) => p.price ? Number(p.price).toLocaleString('ko-KR') + '원' : '가격 준비중';
  let io = null; // reveal observer (declared early to avoid TDZ when renderStore calls observeReveals)

  /* ---- product card (담기 hover 제거 — 카드 전체가 상세로 이동) ---- */
  function card(p) {
    const badge = p.badge === 'BEST'
      ? '<span class="badge best">BEST</span>'
      : (p.price ? '<span class="badge">NEW</span>' : '<span class="badge soon">COMING</span>');
    const pr = p.price
      ? `<div class="pr">${won(p)}</div>`
      : `<div class="pr soon">출시 준비중</div>`;
    return `<article class="pcard rv">
      <a class="ph" href="product.html?no=${p.no}" aria-label="${p.brand} ${p.name}">
        ${badge}<img src="${p.main}" alt="${p.brand} ${p.name}" loading="lazy">
      </a>
      <div class="info">
        ${p.hook ? `<div class="hook">${p.hook}</div>` : ''}
        <div class="brand">${p.brand} <span class="ln">· ${p.line}</span></div>
        <a class="nm" href="product.html?no=${p.no}">${p.name}</a>
        <div class="bl">${p.blurb || ''}</div>
        ${pr}
      </div>
    </article>`;
  }

  /* ---- render grids ---- */
  function renderGrid(sel, list) { const el = $(sel); if (el) el.innerHTML = list.map(card).join(''); }
  const best = P.filter(p => p.badge === 'BEST');
  const news = P.filter(p => p.badge === 'NEW').sort((a, b) => (b.price ? 1 : 0) - (a.price ? 1 : 0));
  renderGrid('#bestGrid', best);
  renderGrid('#newGrid', news); // 홈 보조 그리드(있을 때만)

  /* ---- store full catalog (#storeGrid) + line filter (#storeTabs) ---- */
  const ordered = [...P].sort((a, b) => (a.badge === 'BEST' ? 0 : 1) - (b.badge === 'BEST' ? 0 : 1) || (b.price ? 1 : 0) - (a.price ? 1 : 0) || a.no - b.no);
  function renderStore(line) {
    const list = (!line || line === 'ALL') ? ordered : ordered.filter(p => p.line === line);
    renderGrid('#storeGrid', list.length ? list : ordered);
    observeReveals();
    const cnt = $('#storeCount'); if (cnt) cnt.textContent = (list.length ? list.length : ordered.length) + '개';
  }
  if ($('#storeGrid')) {
    const initLine = (location.hash || '').replace('#', '').toUpperCase();
    const valid = ['CICA', 'BARRIER', 'CLINICAL', 'GLOW', 'MOISTURE', 'CLEANSING', 'SCALP', 'BODY'];
    const start = valid.includes(initLine) ? initLine : 'ALL';
    renderStore(start);
    $$('#storeTabs button').forEach(btn => {
      btn.classList.toggle('on', (btn.dataset.line || 'ALL') === start);
      btn.addEventListener('click', () => {
        $$('#storeTabs button').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        renderStore(btn.dataset.line);
      });
    });
  }

  /* ---- BEST tabs (filter by axis) ---- */
  $$('#bestTabs button').forEach(btn => btn.addEventListener('click', () => {
    $$('#bestTabs button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const ax = btn.dataset.axis;
    const list = ax === 'ALL' ? best : best.filter(p => p.axis === ax);
    renderGrid('#bestGrid', (list.length ? list : best));
    observeReveals();
  }));

  /* ---- hero slider ---- */
  const slides = $$('.hero .slide');
  let hi = 0, htimer;
  function heroGo(n) {
    slides.forEach((s, i) => s.classList.toggle('on', i === n));
    $$('.hero .dots button').forEach((d, i) => d.classList.toggle('on', i === n));
    const pg = $('.hero .pager'); if (pg) pg.textContent = String(n + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    const sn = $('[data-slide-no]'); if (sn) sn.textContent = String(n + 1).padStart(2, '0');
    hi = n;
  }
  function heroNext() { heroGo((hi + 1) % slides.length); }
  if (slides.length) {
    const dotwrap = $('.hero .dots');
    if (dotwrap) dotwrap.innerHTML = slides.map((_, i) => `<button aria-label="slide ${i + 1}"></button>`).join('');
    $$('.hero .dots button').forEach((d, i) => d.addEventListener('click', () => { heroGo(i); restart(); }));
    heroGo(0);
    function restart() { clearInterval(htimer); htimer = setInterval(heroNext, 5200); }
    restart();
  }

  /* ---- GNB overlay — ret1 motion: CSS transform slide-down + GSAP staggered links ---- */
  (function initOverlayGNB() {
    const burger = $('#burger'), overlay = $('.gnbov'); if (!burger || !overlay) return;
    const links = $$('.gnbov-mid a', overlay), closeBtn = $('#ovx');
    let open = false;
    function set(v) {
      open = v;
      burger.classList.toggle('is-open', v);
      overlay.classList.toggle('on', v);           // CSS handles the translateY(-100%)→0 slide
      document.documentElement.style.overflow = v ? 'hidden' : '';
      burger.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v && window.gsap) {                       // ret1-style staggered link entrance
        gsap.killTweensOf(links);
        gsap.fromTo(links, { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', delay: 0.16, overwrite: true });
      } else if (!v && window.gsap) {
        gsap.to(links, { opacity: 0, duration: 0.2 });
      }
    }
    burger.addEventListener('click', () => set(!open));
    if (closeBtn) closeBtn.addEventListener('click', () => set(false));
    links.forEach(a => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) set(false); });
  })();

  /* ---- logo: hover morphs BEAUTY PHARMACY → BP+ (held 5s, no flicker), click spins + ---- */
  $$('[data-logo]').forEach(logo => {
    let rot = 0, holdT = null;
    const morphOn = () => { clearTimeout(holdT); logo.classList.add('morph'); };
    const morphHold = () => { clearTimeout(holdT); holdT = setTimeout(() => logo.classList.remove('morph'), 2000); };
    logo.addEventListener('mouseenter', morphOn);
    logo.addEventListener('mouseleave', morphHold);
    logo.addEventListener('focus', morphOn);
    logo.addEventListener('blur', morphHold);
    logo.addEventListener('click', (e) => {
      morphOn();
      const plus = $('.plus', logo);
      if (plus) { rot += 360; plus.style.setProperty('--pr', rot + 'deg'); }
      const path = location.pathname;
      if (path.endsWith('index.html') || path.endsWith('/') || path === '') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else morphHold();
    });
  });

  /* ---- contact ribbon (ret1 initRibbon — exactly two snakes, JS-measured perimeter) ---- */
  (function initRibbon() {
    function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); return 'M' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) + 'H' + (x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) + 'V' + (y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + 'Z'; }
    $$('.cf-wrap').forEach(wrap => {
      const svg = $('.ribbon', wrap), path = $('.rb', wrap); if (!svg || !path) return;
      let L = 0, start = null, dur = 5200;
      function build() {
        const W = wrap.clientWidth, H = wrap.clientHeight; if (!W || !H) return;
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        path.setAttribute('d', rr(2, 2, W - 4, H - 4, 16));
        L = path.getTotalLength();
        path.style.strokeDasharray = (L * 0.40) + ' ' + (L * 0.10);
      }
      build();
      if (window.ResizeObserver) new ResizeObserver(build).observe(wrap);
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) { function tick(t) { if (start === null) start = t; const p = ((t - start) % dur) / dur; if (L) path.style.strokeDashoffset = String(-p * L); requestAnimationFrame(tick); } requestAnimationFrame(tick); }
    });
  })();

  /* ---- inquiry form (demo submit) ---- */
  $$('[data-inquiry]').forEach(form => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const done = $('[data-inquiry-done]', form);
    if (done) done.style.display = 'block';
    form.querySelectorAll('input,select,textarea,button').forEach(el => { if (el.type !== 'button') el.disabled = true; });
  }));

  /* ---- floating qinq smooth scroll + qtop ---- */
  $$('[data-qinq]').forEach(q => q.addEventListener('click', (e) => {
    const tgt = q.getAttribute('href');
    if (tgt && tgt.charAt(0) === '#') { const el = $(tgt); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); } }
  }));
  const qtop = $('[data-qtop]');
  if (qtop) {
    qtop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => qtop.classList.toggle('show', window.scrollY > 600), { passive: true });
  }

  /* ---- year ---- */
  $$('[data-year]').forEach(el => el.textContent = '2026');

  /* ---- countdown (awards/ranking teaser pages) ---- */
  $$('[data-countdown]').forEach(cd => {
    const target = new Date(cd.dataset.countdown + 'T00:00:00+09:00').getTime();
    const slots = { d: $('[data-d]', cd), h: $('[data-h]', cd), m: $('[data-m]', cd), s: $('[data-s]', cd) };
    function tick() {
      let diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      const pad = (n) => String(n).padStart(2, '0');
      if (slots.d) slots.d.textContent = d;
      if (slots.h) slots.h.textContent = pad(h);
      if (slots.m) slots.m.textContent = pad(m);
      if (slots.s) slots.s.textContent = pad(s);
    }
    tick(); setInterval(tick, 1000);
  });

  /* ---- reveals ---- */
  function observeReveals() {
    if (!('IntersectionObserver' in window)) { $$('.rv').forEach(e => e.classList.add('in')); return; }
    if (!io) io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('.rv:not(.in)').forEach(e => io.observe(e));
  }
  observeReveals();

  /* ---- count-up (numbers) ---- */
  function countUp(el) {
    const target = +el.dataset.to, suf = el.dataset.suf || '', dur = 1400, t0 = performance.now();
    function step(t) {
      const k = Math.min(1, (t - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - k, 3)));
      el.firstChild ? el.childNodes[0].nodeValue = v : el.textContent = v;
      el.innerHTML = v + (suf ? '<sup>' + suf + '</sup>' : '');
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    const nio = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { countUp(e.target); nio.unobserve(e.target); } });
    }, { threshold: 0.5 });
    $$('.numbers .v[data-to]').forEach(el => nio.observe(el));
  } else { $$('.numbers .v[data-to]').forEach(el => countUp(el)); }

})();
