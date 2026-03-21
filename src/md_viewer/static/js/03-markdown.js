function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const idx = text.indexOf('\n---', 3);
  if (idx < 0) return text;
  return text.slice(idx + 4);
}

const FILE_COLORS = [
  'linear-gradient(135deg, #7c8aff, #a78bfa)',
  'linear-gradient(135deg, #4ade80, #22d3ee)',
  'linear-gradient(135deg, #fbbf24, #f97316)',
  'linear-gradient(135deg, #f87171, #ec4899)',
  'linear-gradient(135deg, #22d3ee, #3b82f6)',
  'linear-gradient(135deg, #a78bfa, #ec4899)',
  'linear-gradient(135deg, #34d399, #4ade80)',
  'linear-gradient(135deg, #fb923c, #fbbf24)',
];

// ---- Settings state ----
let _iconStyle = localStorage.getItem('mdviewer_icon_style') || 'colorful';
let _tocPosition = localStorage.getItem('mdviewer_toc_position') || 'sidebar';

function buildNavIconHtml(idx) {
  const colorIdx = idx % FILE_COLORS.length;
  if (_iconStyle === 'monochrome') {
    return `<div class="nav-icon-sm" style="background:var(--accent-dim);width:22px;height:22px;border-radius:5px;display:grid;place-items:center;flex-shrink:0;color:var(--accent);"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 4h8v2H8v-2z"/></svg></div>`;
  }
  return `<div class="nav-icon-sm" style="background:${FILE_COLORS[colorIdx]};width:22px;height:22px;border-radius:5px;display:grid;place-items:center;flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 4h8v2H8v-2z"/></svg></div>`;
}

function buildFileIconSvg(idx) {
  if (_iconStyle === 'monochrome') {
    return `<svg width="48" height="56" viewBox="0 0 48 56" fill="none"><path d="M4 4a4 4 0 0 1 4-4h22l14 14v38a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V4z" style="fill:var(--accent-dim);stroke:var(--accent);stroke-width:1.5"/><path d="M26 0l14 14H30a4 4 0 0 1-4-4V0z" style="fill:var(--accent)"/><line x1="14" y1="28" x2="34" y2="28" style="stroke:var(--accent)" stroke-width="2" stroke-linecap="round" opacity="0.5"/><line x1="14" y1="34" x2="34" y2="34" style="stroke:var(--accent)" stroke-width="2" stroke-linecap="round" opacity="0.5"/><line x1="14" y1="40" x2="28" y2="40" style="stroke:var(--accent)" stroke-width="2" stroke-linecap="round" opacity="0.5"/></svg>`;
  }
  const colorIdx = idx % FILE_COLORS.length;
  const colors = FILE_COLORS[colorIdx].match(/#[a-f0-9]+/gi);
  return `<svg width="48" height="56" viewBox="0 0 48 56" fill="none"><path d="M4 4a4 4 0 0 1 4-4h22l14 14v38a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V4z" fill="url(#fg${idx})"/><path d="M26 0l14 14H30a4 4 0 0 1-4-4V0z" fill="rgba(255,255,255,0.25)"/><line x1="14" y1="28" x2="34" y2="28" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="34" x2="34" y2="34" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="40" x2="28" y2="40" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round"/><defs><linearGradient id="fg${idx}" x1="0" y1="0" x2="48" y2="56" gradientUnits="userSpaceOnUse"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs></svg>`;
}

async function init() {
  try {
    const resp = await fetch('/api/files');
    const data = await resp.json();
    FILES = data.files;
    const pathEl = document.getElementById('badgePath');
    pathEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg><span class="path-text">' + data.root + '</span>';
    pathEl.title = data.root;
  } catch {
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128466;</div>
        <h2>No API available</h2>
        <p>Run with: python3 md-viewer.py</p>
      </div>`;
    return;
  }

  if (FILES.length === 0) {
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128466;</div>
        <h2>No .md files found</h2>
        <p>Place .md files in the directory and refresh.</p>
      </div>`;
    return;
  }

  renderNav();
  document.getElementById('fileCount').textContent = '(' + FILES.length + ')';

  // Check URL hash — open file if specified, otherwise show dashboard
  const hash = window.location.hash.slice(1);
  const hashIdx = FILES.findIndex(f => slugify(f.path) === hash);
  if (hashIdx >= 0) {
    showFile(hashIdx);
  } else {
    showDashboard();
  }
}

function slugify(s) { return s.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase(); }

function slugifyHeading(text, usedSlugs) {
  let base = text.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'heading';
  let slug = base;
  let counter = 1;
  while (usedSlugs.has(slug)) {
    slug = base + '-' + counter;
    counter++;
  }
  usedSlugs.add(slug);
  return slug;
}

