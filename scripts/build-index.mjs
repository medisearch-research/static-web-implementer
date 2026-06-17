#!/usr/bin/env node
/**
 * build-index.mjs — auto-generate the root index.html
 *
 * Scans every *.html file under /sites, groups them by project folder,
 * extracts each page's <title> / <meta name="description"> / version, and
 * renders a single self-contained index.html (inline CSS, Google Fonts CDN).
 *
 * Two kinds of entries are recognised inside a project folder:
 *   1. A single .html file directly under sites/<project>/      → one tile / file.
 *   2. A multi-file sub-project sites/<project>/<subdir>/ that
 *      ships its own index.html (skins, assets, …)              → ONE tile that
 *      points at that subdir's index.html. Inner pages (e.g. skin
 *      variants) are reached through that entry page, not listed separately.
 *
 * The generated page also carries a client-side search box that filters the
 * tiles by title / description / file / project — pure inline JS, no deps.
 *
 * Pure Node, zero dependencies. Run from anywhere:
 *     node scripts/build-index.mjs
 *
 * Output is deterministic (no timestamps) so re-running only changes the
 * file when the set of pages actually changed — keeps git diffs clean.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITES_DIR = join(REPO_ROOT, 'sites');
const OUTPUT = join(REPO_ROOT, 'index.html');

// Pretty display names for known project folders. Unknown folders fall back
// to a title-cased version of the folder name.
const PROJECT_NAMES = {
  medisearch: 'MediSearch',
  'bp-plus': 'BP+',
  bps: 'BP+',
  yaksaseyo: 'YakSaseyo · 약사세요',
  pharmdash: 'Pharmdash',
};

// ---------- helpers ----------

function walkHtml(dir) {
  // Returns absolute paths of every .html file under `dir`, recursively.
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) out.push(full);
  }
  return out;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(str) {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_, n) => NAMED_ENTITIES[n.toLowerCase()]);
}

function stripTags(str) {
  // Strip tags, decode entities (so re-escaping later doesn't double-encode),
  // then collapse whitespace.
  return decodeEntities(str.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function extractTitle(html, fallback) {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t && stripTags(t[1])) return stripTags(t[1]);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1 && stripTags(h1[1])) return stripTags(h1[1]);
  return fallback;
}

function extractDescription(html) {
  // Match a <meta> tag that carries name="description", in either attr order.
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metas) {
    if (!/name\s*=\s*["']description["']/i.test(tag)) continue;
    const c = tag.match(/content\s*=\s*["']([\s\S]*?)["']/i);
    if (c) return stripTags(c[1]);
  }
  return '';
}

function extractVersion(filename) {
  const m = filename.match(/-v(\d+)\b/i);
  return m ? `v${m[1]}` : '';
}

function projectDisplayName(key) {
  return PROJECT_NAMES[key] || key.replace(/(^|[-_])([a-z])/g, (_, s, c) => (s ? ' ' : '') + c.toUpperCase());
}

// Build one page record from an HTML file on disk.
function makePage(abs, { label, href, isProject = false }) {
  const html = readFileSync(abs, 'utf8');
  return {
    title: extractTitle(html, label),
    desc: extractDescription(html),
    version: extractVersion(label),
    href,
    file: label,
    isProject,
  };
}

// ---------- scan ----------

if (!existsSync(SITES_DIR)) {
  console.error(`[build-index] sites directory not found: ${SITES_DIR}`);
  process.exit(1);
}

// Group every discovered .html by its top-level project folder.
const byProject = new Map(); // project -> [{ rel, parts, abs }]
for (const abs of walkHtml(SITES_DIR)) {
  const rel = relative(SITES_DIR, abs);
  const parts = rel.split(sep);
  const project = parts[0];
  if (!byProject.has(project)) byProject.set(project, []);
  byProject.get(project).push({ rel, parts, abs });
}

const projects = new Map(); // project -> [page]

for (const [project, files] of byProject) {
  // Deterministic processing order regardless of filesystem walk order.
  files.sort((a, b) => a.rel.localeCompare(b.rel));

  const pages = [];
  const seenSubdirs = new Set();

  for (const { parts, abs } of files) {
    if (parts.length === 2) {
      // sites/<project>/<page>.html — a single-file design.
      const file = parts[1];
      pages.push(makePage(abs, { label: file, href: `sites/${parts.join('/')}` }));
      continue;
    }

    // Nested: sites/<project>/<subdir>/…/<file>.html
    const subdir = parts[1];
    const subIndex = join(SITES_DIR, project, subdir, 'index.html');

    if (existsSync(subIndex)) {
      // Multi-file sub-project: collapse the whole subdir into a single tile
      // that opens its index.html. Inner pages are reached from there.
      if (seenSubdirs.has(subdir)) continue;
      seenSubdirs.add(subdir);
      const page = makePage(subIndex, {
        label: `${subdir}/`,
        href: `sites/${project}/${subdir}/index.html`,
        isProject: true,
      });
      // Fold inner page titles/descriptions into the search haystack so the
      // collapsed tile is findable by any inner page (e.g. an individual skin
      // name) — without cluttering the visible card text.
      page.searchExtra = files
        .filter((f) => f.parts.length > 2 && f.parts[1] === subdir)
        .map((f) => {
          const h = readFileSync(f.abs, 'utf8');
          return [extractTitle(h, ''), extractDescription(h)].filter(Boolean).join(' ');
        })
        .join(' ');
      pages.push(page);
    } else {
      // Subdir without its own index.html — keep every page discoverable.
      const file = parts[parts.length - 1];
      pages.push(makePage(abs, { label: file, href: `sites/${parts.join('/')}` }));
    }
  }

  projects.set(project, pages);
}

// Stack ordering: newest on top. Tiles within a group sort by label
// (date-prefixed folder/file name) descending; project groups sort by their
// newest tile descending — so a newly added project/tile pushes older ones
// down the stack. Deterministic (name-based, no timestamps).
for (const arr of projects.values()) {
  arr.sort((a, b) => b.file.localeCompare(a.file));
}
const projectKeys = [...projects.keys()].sort((a, b) => {
  const byNewest = projects.get(b)[0].file.localeCompare(projects.get(a)[0].file);
  return byNewest !== 0 ? byNewest : a.localeCompare(b);
});

const totalPages = [...projects.values()].reduce((n, arr) => n + arr.length, 0);

// ---------- render ----------

function renderCard(page, projectKey, projectName) {
  const versionBadge = page.version
    ? `<span class="badge">${escapeHtml(page.version)}</span>`
    : '';
  const folderBadge = page.isProject ? '<span class="badge badge--folder">프로젝트</span>' : '';
  const desc = page.desc
    ? `<p class="card-desc">${escapeHtml(page.desc)}</p>`
    : '<p class="card-desc card-desc--empty">설명이 없습니다.</p>';
  // Lower-cased haystack for the client-side filter.
  const haystack = escapeHtml(
    [page.title, page.desc, page.file, projectKey, projectName, page.searchExtra || '']
      .join(' ')
      .toLowerCase()
  );
  return `        <a class="card" href="${escapeHtml(page.href)}" data-search="${haystack}">
          <div class="card-top">
            <h3 class="card-title">${escapeHtml(page.title)}</h3>
            ${[folderBadge, versionBadge].filter(Boolean).join('\n            ')}
          </div>
          ${desc}
          <code class="card-file">${escapeHtml(page.file)}</code>
          <span class="card-open">미리보기 열기 →</span>
        </a>`;
}

function renderProject(key) {
  const name = projectDisplayName(key);
  const pages = projects.get(key);
  return `      <section class="project" id="${escapeHtml(key)}">
        <div class="project-head">
          <h2 class="project-tag">${escapeHtml(name)}</h2>
          <span class="project-count">${pages.length}개 디자인</span>
        </div>
        <div class="grid">
${pages.map((p) => renderCard(p, key, name)).join('\n')}
        </div>
      </section>`;
}

const projectSections = projectKeys.length
  ? projectKeys.map(renderProject).join('\n')
  : `      <div class="empty">
        <p>아직 등록된 디자인이 없습니다.</p>
        <p class="empty-hint"><code>sites/&lt;프로젝트&gt;/</code> 폴더에 <code>.html</code> 파일을 추가하세요.</p>
      </div>`;

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>디자인 구현 목록 · static-web-implementer</title>
  <meta name="description" content="Claude Code로 구현한 정적 디자인 페이지 목록. 검색하고, 클릭하면 브라우저에서 바로 검토할 수 있습니다." />
  <!-- This file is AUTO-GENERATED by scripts/build-index.mjs. Do not edit by hand. -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0b1020;
      --bg-soft: #121a33;
      --card: #161f3d;
      --card-hover: #1d2950;
      --line: #26315a;
      --text: #e8ecf8;
      --muted: #99a3c4;
      --accent: #6ea8fe;
      --accent-2: #8ef0d0;
      --radius: 16px;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans KR', system-ui, -apple-system, 'Segoe UI', sans-serif;
      background: radial-gradient(1200px 600px at 15% -10%, #1a2750 0%, transparent 60%), var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }
    .wrap { max-width: 1080px; margin: 0 auto; padding: 56px 24px 96px; }
    header.page-head { margin-bottom: 40px; }
    .eyebrow {
      display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; color: var(--accent-2);
      background: rgba(142,240,208,.1); border: 1px solid rgba(142,240,208,.25);
      padding: 5px 12px; border-radius: 999px;
    }
    h1 { font-size: clamp(28px, 5vw, 44px); font-weight: 900; margin: 18px 0 10px; letter-spacing: -.02em; }
    .lede { color: var(--muted); font-size: 16px; max-width: 60ch; margin: 0; }
    .meta-line { margin-top: 18px; color: var(--muted); font-size: 14px; }
    .meta-line strong { color: var(--text); }
    .result-count { color: var(--accent-2); }

    .search-wrap { position: relative; margin-top: 22px; max-width: 520px; }
    .search-wrap > svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
    .search {
      width: 100%; font: inherit; font-size: 15px; color: var(--text);
      background: var(--card); border: 1px solid var(--line); border-radius: 12px;
      padding: 13px 14px 13px 42px; outline: none;
      transition: border-color .15s ease, background .15s ease;
    }
    .search::placeholder { color: var(--muted); }
    .search:focus { border-color: var(--accent); background: var(--card-hover); }
    .search:focus + .search-clear, .search-clear:focus { color: var(--text); }

    /* Each project is a tagged, bordered group box. Groups stack newest-first. */
    .project {
      margin-top: 26px;
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 22px 22px 26px;
      background: linear-gradient(180deg, rgba(255,255,255,.025), transparent 140px), var(--bg-soft);
    }
    .project-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .project-tag {
      font-size: 14px; font-weight: 800; margin: 0; letter-spacing: .02em;
      color: var(--accent); background: rgba(110,168,254,.12);
      border: 1px solid rgba(110,168,254,.5); border-radius: 999px; padding: 6px 16px;
    }
    .project-count { color: var(--muted); font-size: 13px; }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 4px; }
    .card {
      display: flex; flex-direction: column; gap: 10px;
      background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
      padding: 20px; text-decoration: none; color: inherit;
      transition: transform .15s ease, background .15s ease, border-color .15s ease;
    }
    .card:hover { transform: translateY(-3px); background: var(--card-hover); border-color: var(--accent); }
    .card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    .card-title { font-size: 22px; font-weight: 900; margin: 0; flex: 1 1 auto; color: #fff; letter-spacing: -.01em; line-height: 1.25; }
    .badge { flex: none; font-size: 12px; font-weight: 700; color: #0b1020; background: var(--accent-2); border-radius: 999px; padding: 2px 9px; }
    .badge--folder { color: var(--text); background: rgba(110,168,254,.18); border: 1px solid rgba(110,168,254,.45); }
    .card-desc { color: var(--muted); font-size: 14px; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .card-desc--empty { font-style: italic; opacity: .7; }
    .card-file { font-size: 12px; color: var(--accent); background: rgba(110,168,254,.1); padding: 4px 8px; border-radius: 8px; align-self: flex-start; word-break: break-all; }
    .card-open { margin-top: auto; font-size: 13px; font-weight: 600; color: var(--accent); }

    .empty { text-align: center; padding: 80px 20px; color: var(--muted); border: 1px dashed var(--line); border-radius: var(--radius); margin-top: 32px; }
    .empty-hint { font-size: 14px; }
    .no-results { display: none; text-align: center; padding: 64px 20px; color: var(--muted); border: 1px dashed var(--line); border-radius: var(--radius); margin-top: 24px; }
    .no-results strong { color: var(--text); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

    /* [hidden] must beat the explicit display rules above when filtering. */
    .card[hidden], .project[hidden] { display: none !important; }

    footer.page-foot { margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; }
    footer.page-foot a { color: var(--accent); text-decoration: none; }
    footer.page-foot a:hover { text-decoration: underline; }

    @media (max-width: 540px) { .wrap { padding: 36px 16px 64px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="page-head">
      <span class="eyebrow">Design Review</span>
      <h1>디자인 구현 목록</h1>
      <p class="lede">Claude Code로 구현한 정적 디자인 페이지 모음입니다. 검색하거나 카드를 클릭하면 브라우저에서 바로 검토할 수 있습니다.</p>
      <p class="meta-line">총 <strong>${projectKeys.length}</strong>개 프로젝트 · <strong>${totalPages}</strong>개 페이지<span class="result-count" id="result-count"></span></p>
      <div class="search-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input id="q" class="search" type="search" placeholder="제목 · 설명 · 파일 · 프로젝트로 검색…" autocomplete="off" aria-label="디자인 검색" />
      </div>
    </header>

    <main>
${projectSections}
      <p class="no-results" id="no-results"><strong>검색 결과가 없습니다.</strong><br />다른 키워드로 검색해 보세요.</p>
    </main>

    <footer class="page-foot">
      이 페이지는 <code>scripts/build-index.mjs</code>가 <code>/sites</code>를 스캔해 자동 생성합니다. 직접 수정하지 마세요.
    </footer>
  </div>

  <script>
    (function () {
      var q = document.getElementById('q');
      if (!q) return;
      var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
      var sections = Array.prototype.slice.call(document.querySelectorAll('.project'));
      var noResults = document.getElementById('no-results');
      var countEl = document.getElementById('result-count');

      function apply() {
        var term = q.value.trim().toLowerCase();
        var visible = 0;
        cards.forEach(function (card) {
          var hay = card.getAttribute('data-search') || '';
          var show = !term || hay.indexOf(term) !== -1;
          card.hidden = !show;
          if (show) visible++;
        });
        sections.forEach(function (sec) {
          sec.hidden = !sec.querySelector('.card:not([hidden])');
        });
        if (noResults) noResults.style.display = (term && visible === 0) ? 'block' : 'none';
        if (countEl) countEl.textContent = term ? (' · ' + visible + '개 검색됨') : '';
      }

      q.addEventListener('input', apply);
      q.addEventListener('keydown', function (e) { if (e.key === 'Escape') { q.value = ''; apply(); } });

      // Deep link: index.html?q=rose pre-fills and filters.
      var initial = new URLSearchParams(location.search).get('q');
      if (initial) { q.value = initial; apply(); }
    })();
  </script>
</body>
</html>
`;

writeFileSync(OUTPUT, html, 'utf8');
console.log(`[build-index] wrote ${relative(REPO_ROOT, OUTPUT)} — ${projectKeys.length} project(s), ${totalPages} tile(s).`);
