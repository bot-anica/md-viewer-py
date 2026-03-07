let FILES = [];
let fileContents = {};
let activeFileIdx = null;

// ---- Configure marked with mermaid renderer ----
marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang === 'mermaid') {
        return '<div class="mermaid">' + text + '</div>';
      }
      return false; // fall back to default
    }
  }
});

// ---- Mermaid init ----
let _mermaidTheme = 'dark';
function initMermaid(theme) {
  _mermaidTheme = theme;
  mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default' });
}
initMermaid('dark');

async function runMermaid() {
  const nodes = document.querySelectorAll('.mermaid:not([data-processed])');
  if (nodes.length === 0) return;
  nodes.forEach(el => { if (!el.hasAttribute('data-mermaid-src')) el.setAttribute('data-mermaid-src', el.textContent); });
  try { await mermaid.run({ nodes }); } catch (e) {}
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
  await loadAllFiles();

  // Check URL hash
  const hash = window.location.hash.slice(1);
  const hashIdx = FILES.findIndex(f => slugify(f.path) === hash);
  showFile(hashIdx >= 0 ? hashIdx : 0);
}

function slugify(s) { return s.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase(); }

async function loadAllFiles() {
  const loads = FILES.map(async (f, i) => {
    try {
      const resp = await fetch('/files/' + encodeURIComponent(f.path));
      if (!resp.ok) throw new Error(resp.status);
      fileContents[i] = await resp.text();
    } catch {
      fileContents[i] = `# Error loading ${f.path}`;
    }
  });
  await Promise.all(loads);
}

function buildTree(files) {
  // Build a nested tree: { _files: [...], subfolder: { _files: [...], ... } }
  const root = { _files: [] };
  files.forEach((f, i) => {
    f._idx = i;
    const parts = f.folder ? f.folder.split('/') : [];
    let node = root;
    for (const part of parts) {
      if (!node[part]) node[part] = { _files: [] };
      node = node[part];
    }
    node._files.push(f);
  });
  return root;
}

function countFiles(node) {
  let n = node._files ? node._files.length : 0;
  for (const key of Object.keys(node)) {
    if (key === '_files') continue;
    n += countFiles(node[key]);
  }
  return n;
}

let hasFolders = false;

function renderNav() {
  const container = document.getElementById('navItems');
  container.innerHTML = '';
  const tree = buildTree(FILES);

  // Check if there are any folders
  hasFolders = Object.keys(tree).filter(k => k !== '_files').length > 0;
  document.getElementById('sidebarToolbar').style.display = hasFolders ? 'flex' : 'none';

  if (!hasFolders) {
    const label = document.createElement('div');
    label.className = 'sidebar-section-label';
    label.textContent = 'Files';
    container.appendChild(label);
  }

  renderTreeNode(container, tree, 0, true);
}

function collapseAll() {
  document.querySelectorAll('#navItems .tree-folder').forEach(h => h.classList.add('collapsed'));
  document.querySelectorAll('#navItems .tree-children').forEach(c => c.classList.add('collapsed'));
  // Re-expand path to active file
  if (activeFileIdx !== null) {
    const navEl = document.getElementById('nav-' + activeFileIdx);
    if (navEl) {
      let el = navEl.parentElement;
      while (el && el.id !== 'navItems') {
        if (el.classList.contains('tree-children') && el.classList.contains('collapsed')) {
          el.classList.remove('collapsed');
          const header = el.previousElementSibling;
          if (header && header.classList.contains('tree-folder')) header.classList.remove('collapsed');
        }
        el = el.parentElement;
      }
    }
  }
}

function renderTreeNode(parent, node, depth, isRoot) {
  const folderKeys = Object.keys(node).filter(k => k !== '_files').sort();
  const indent = 12 + depth * 16;

  // Render subfolders first
  folderKeys.forEach(name => {
    const child = node[name];
    const count = countFiles(child);
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node';

    const header = document.createElement('div');
    header.className = 'tree-folder' + (depth > 0 ? ' collapsed' : '');
    header.style.paddingLeft = indent + 'px';
    header.innerHTML = `<span class="chevron"><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,2 10,2 5,8" fill="currentColor"/></svg></span><span class="folder-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg></span><span class="folder-name">${name}</span><span class="folder-count">${count}</span>`;

    const children = document.createElement('div');
    children.className = 'tree-children' + (depth > 0 ? ' collapsed' : '');

    header.onclick = () => {
      header.classList.toggle('collapsed');
      children.classList.toggle('collapsed');
    };

    wrapper.appendChild(header);
    renderTreeNode(children, child, depth + 1, false);
    wrapper.appendChild(children);
    parent.appendChild(wrapper);
  });

  // Render files
  if (node._files) {
    node._files.forEach(f => {
      parent.appendChild(createNavItem(f, indent));
    });
  }
}

function createNavItem(f, indent) {
  const item = document.createElement('div');
  item.className = 'nav-item';
  item.id = 'nav-' + f._idx;
  item.style.paddingLeft = (indent + 8) + 'px';
  item.onclick = (e) => { e.stopPropagation(); showFile(f._idx); };

  const colorIdx = f._idx % FILE_COLORS.length;
  item.innerHTML = `
    <div class="nav-icon-sm" style="background:${FILE_COLORS[colorIdx]};width:22px;height:22px;border-radius:5px;display:grid;place-items:center;flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 4h8v2H8v-2z"/></svg></div>
    <div class="nav-details">
      <div class="nav-title">${f.title}</div>
      <div class="nav-meta">${f.name} &middot; ${f.lines} lines</div>
    </div>
  `;
  return item;
}

async function showFile(idx) {
  activeFileIdx = idx;
  const f = FILES[idx];
  window.location.hash = slugify(f.path);

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav-' + idx);
  if (navEl) {
    navEl.classList.add('active');
    // Expand parent folders if collapsed
    let el = navEl.parentElement;
    while (el && el.id !== 'navItems') {
      if (el.classList.contains('tree-children') && el.classList.contains('collapsed')) {
        el.classList.remove('collapsed');
        const header = el.previousElementSibling;
        if (header && header.classList.contains('tree-folder')) header.classList.remove('collapsed');
      }
      el = el.parentElement;
    }
    // Scroll nav item into view in sidebar
    navEl.scrollIntoView({ block: 'nearest' });
  }

  // Always fetch fresh content from server
  try {
    const resp = await fetch('/files/' + encodeURIComponent(f.path));
    if (resp.ok) fileContents[idx] = await resp.text();
  } catch {}

  const md = fileContents[idx] || '';
  const html = marked.parse(md, { gfm: true, breaks: false });

  const content = document.getElementById('content');
  content.innerHTML = html;
  content.style.display = 'block';
  document.getElementById('loading').style.display = 'none';

  makeSectionsCollapsible(content);
  content.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
  addCopyButtons(content);

  // Breadcrumb bar (file name + collapse/expand)
  const bc = document.getElementById('breadcrumb');
  if (f.folder) {
    const parts = f.folder.split('/');
    bc.innerHTML = parts.map(p => `<span>${p}</span>`).join('<span class="sep">/</span>') + `<span class="sep">/</span><span>${f.name}</span>`;
  } else {
    bc.innerHTML = `<span>${f.name}</span>`;
  }
  document.getElementById('breadcrumbBar').style.display = 'flex';

  buildToc();
  addHeadingAnchors();
  interceptMdLinks(content, f.path);
  runMermaid();
  window.scrollTo({ top: 0 });

  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function makeSectionsCollapsible(container) {
  wrapLevel(container, 2);
}

function wrapLevel(container, level) {
  const tag = 'H' + level;
  const children = Array.from(container.children);
  let i = 0;

  while (i < children.length) {
    const el = children[i];
    if (el.tagName !== tag) { i++; continue; }

    const body = document.createElement('div');
    body.className = 'section-body';

    // Collect siblings until next heading of same or higher level
    let next = el.nextElementSibling;
    while (next && !(next.tagName && next.tagName.match(/^H[1-9]$/) && parseInt(next.tagName[1]) <= level)) {
      const move = next;
      next = next.nextElementSibling;
      body.appendChild(move);
    }

    if (body.children.length > 0) {
      el.after(body);
      el.onclick = (e) => {
        if (e.target.closest && e.target.closest('a')) return;
        if (e.target.tagName === 'A') return;
        el.classList.toggle('collapsed');
        body.classList.toggle('collapsed');
      };
      // Recurse into this section-body for deeper headings
      if (level < 4) wrapLevel(body, level + 1);
    }

    // Re-scan since DOM changed
    children.length = 0;
    children.push(...Array.from(container.children));
    i = children.indexOf(body) + 1;
  }
}

function collapseSections(collapse) {
  const content = document.getElementById('content');
  content.querySelectorAll('h2, h3, h4').forEach(h => {
    const body = h.nextElementSibling;
    if (!body || !body.classList.contains('section-body')) return;
    if (collapse) {
      h.classList.add('collapsed');
      body.classList.add('collapsed');
    } else {
      h.classList.remove('collapsed');
      body.classList.remove('collapsed');
    }
  });
}

let tocAutoMode = true; // auto-open/close TOC groups on scroll
let tocHeadings = [];   // [{el, slug, level, tocEl, groupEl, childrenEl}]

function buildToc() {
  const container = document.getElementById('tocContainer');
  container.innerHTML = '';
  tocHeadings = [];

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'toc-toolbar';
  toolbar.innerHTML = `
    <div class="sidebar-section-label">On this page</div>
    <div class="toc-btns">
      <button class="collapse-btn" onclick="tocCollapseAll()" title="Collapse TOC"><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="2,0 8,5 2,10" fill="currentColor"/></svg></button>
      <button class="collapse-btn" onclick="tocExpandAll()" title="Expand TOC"><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,2 10,2 5,8" fill="currentColor"/></svg></button>
    </div>
  `;
  container.appendChild(toolbar);

  const headings = document.querySelectorAll('.md h2, .md h3');
  let currentGroup = null;
  let currentChildren = null;
  let currentH2Entry = null;

  headings.forEach((h, i) => {
    const slug = 'heading-' + i;
    h.id = slug;

    if (h.tagName === 'H2') {
      // Create collapsible group
      const group = document.createElement('div');
      group.className = 'toc-group';

      const h2Link = document.createElement('a');
      h2Link.className = 'toc-h2 collapsed';
      h2Link.href = '#' + slug;
      h2Link.innerHTML = `<span class="toc-chevron">&#9660;</span><span class="toc-h2-text">${h.textContent}</span>`;

      const children = document.createElement('div');
      children.className = 'toc-children collapsed';

      h2Link.onclick = (e) => {
        e.preventDefault();
        tocScrollTo(h);
      };

      group.appendChild(h2Link);
      group.appendChild(children);
      container.appendChild(group);

      currentGroup = group;
      currentChildren = children;
      currentH2Entry = { el: h, slug, level: 2, tocEl: h2Link, groupEl: group, childrenEl: children };
      tocHeadings.push(currentH2Entry);

    } else if (h.tagName === 'H3') {
      const h3Link = document.createElement('a');
      h3Link.className = 'toc-h3';
      h3Link.textContent = h.textContent;
      h3Link.href = '#' + slug;
      h3Link.onclick = (e) => {
        e.preventDefault();
        tocScrollTo(h);
      };

      if (currentChildren) {
        currentChildren.appendChild(h3Link);
      } else {
        container.appendChild(h3Link);
      }

      tocHeadings.push({ el: h, slug, level: 3, tocEl: h3Link, parentH2: currentH2Entry });
    }
  });

  tocAutoMode = true;
}

function tocScrollTo(h) {
  // Expand content section if collapsed
  if (h.classList.contains('collapsed')) {
    h.classList.remove('collapsed');
    const body = h.nextElementSibling;
    if (body && body.classList.contains('section-body')) body.classList.remove('collapsed');
  }
  h.scrollIntoView({ behavior: 'smooth', block: 'start' });
  h.classList.add('highlight-flash');
  setTimeout(() => h.classList.remove('highlight-flash'), 1500);
}

function tocCollapseAll() {
  tocAutoMode = true;
  document.querySelectorAll('.toc-h2').forEach(el => el.classList.add('collapsed'));
  document.querySelectorAll('.toc-children').forEach(el => el.classList.add('collapsed'));
  // Re-run scroll spy to open current section
  updateScrollSpy();
}

function tocExpandAll() {
  tocAutoMode = false;
  document.querySelectorAll('.toc-h2').forEach(el => el.classList.remove('collapsed'));
  document.querySelectorAll('.toc-children').forEach(el => el.classList.remove('collapsed'));
}

function updateScrollSpy() {
  if (tocHeadings.length === 0) return;

  const scrollY = window.scrollY;
  const offset = 100;

  // Find the current heading: last heading whose top <= scrollY + offset
  let activeIdx = -1;
  for (let i = tocHeadings.length - 1; i >= 0; i--) {
    const rect = tocHeadings[i].el.getBoundingClientRect();
    if (rect.top <= offset) { activeIdx = i; break; }
  }

  // Clear all active
  tocHeadings.forEach(t => t.tocEl.classList.remove('active'));

  if (activeIdx < 0) return;

  const active = tocHeadings[activeIdx];
  active.tocEl.classList.add('active');

  // Also highlight parent H2 if active is H3
  if (active.level === 3 && active.parentH2) {
    active.parentH2.tocEl.classList.add('active');
  }

  // Auto-open/close TOC groups when in auto mode
  if (tocAutoMode) {
    // Find which H2 group is active
    let activeH2 = active.level === 2 ? active : (active.parentH2 || null);

    tocHeadings.forEach(t => {
      if (t.level !== 2) return;
      if (t === activeH2) {
        t.tocEl.classList.remove('collapsed');
        if (t.childrenEl) t.childrenEl.classList.remove('collapsed');
      } else {
        t.tocEl.classList.add('collapsed');
        if (t.childrenEl) t.childrenEl.classList.add('collapsed');
      }
    });
  }

  // Scroll active TOC item into view in sidebar
  active.tocEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function handleSearch(query) {
  const results = document.getElementById('searchResults');
  if (query.length < 2) { results.classList.remove('active'); results.innerHTML = ''; return; }

  const q = query.toLowerCase();
  let items = [];
  FILES.forEach((f, idx) => {
    const text = fileContents[idx] || '';
    text.split('\n').forEach((line, lineNum) => {
      if (line.toLowerCase().includes(q)) {
        const clean = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        if (!clean) return;
        items.push({ idx, file: f, line: clean, lineNum });
      }
    });
  });
  items = items.slice(0, 15);

  if (items.length === 0) {
    results.innerHTML = '<div style="padding:6px 10px;font-size:12px;color:var(--text-muted)">No results</div>';
    results.classList.add('active');
    return;
  }

  const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  results.innerHTML = items.map(it => {
    const h = it.line.substring(0, 100).replace(re, '<mark>$1</mark>');
    return `<div class="search-result-item" onclick="showFile(${it.idx});searchScroll(${it.lineNum})">
      <div class="file-label">${it.file.title}</div>
      <div class="match-text">${h}${it.line.length > 100 ? '...' : ''}</div>
    </div>`;
  }).join('');
  results.classList.add('active');
}

function searchScroll(lineNum) {
  document.getElementById('search').value = '';
  document.getElementById('searchResults').classList.remove('active');
  const content = document.getElementById('content');
  const total = (fileContents[activeFileIdx] || '').split('\n').length;
  const pct = lineNum / total;
  window.scrollTo({ top: content.offsetTop + content.scrollHeight * pct - 100, behavior: 'smooth' });
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function interceptMdLinks(container, currentFilePath) {
  container.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^https?:\/\//.test(href) || href.startsWith('mailto:')) return;
    const [filePart] = href.split('#');
    if (!filePart.endsWith('.md')) return;
    // Resolve relative path against current file's directory
    const dir = currentFilePath && currentFilePath.includes('/')
      ? currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))
      : '';
    const raw = dir ? dir + '/' + filePart : filePart;
    // Normalize path segments (handle ../ and ./)
    const parts = raw.split('/');
    const norm = [];
    for (const p of parts) {
      if (p === '..') norm.pop();
      else if (p !== '.') norm.push(p);
    }
    const resolvedPath = norm.join('/');
    const targetIdx = FILES.findIndex(f => f.path === resolvedPath);
    if (targetIdx < 0) return;
    a.addEventListener('click', e => { e.preventDefault(); showFile(targetIdx); });
  });
}

function addCopyButtons(container) {
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.title = 'Copy code';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      const text = code ? code.innerText : pre.innerText;
      try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
          btn.classList.remove('copied');
        }, 1500);
      } catch {}
    });
    pre.appendChild(btn);
  });
}

function addHeadingAnchors() {
  document.querySelectorAll('.md h1, .md h2, .md h3, .md h4').forEach(h => {
    if (h.querySelector('.heading-anchor')) return;
    const id = h.id || ('ha-' + Math.random().toString(36).slice(2));
    if (!h.id) h.id = id;
    const a = document.createElement('a');
    a.className = 'heading-anchor';
    a.href = '#' + id;
    a.textContent = '#';
    a.onclick = function(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      var targetEl = document.getElementById(id);
      if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    h.appendChild(a);
  });
}

let _currentTheme = localStorage.getItem('md-viewer-theme') || 'dark';
function applyTheme(theme) {
  _currentTheme = theme;
  document.body.classList.toggle('light', theme === 'light');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = theme === 'dark'
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><circle cx="12" cy="12" r="5"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></g></svg> Light'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark';
  const darkCss = document.getElementById('hljs-dark-css');
  const lightCss = document.getElementById('hljs-light-css');
  if (darkCss) darkCss.disabled = theme === 'light';
  if (lightCss) lightCss.disabled = theme === 'dark';
  initMermaid(theme);
  // Re-render mermaid diagrams with new theme
  document.querySelectorAll('.mermaid[data-processed]').forEach(el => {
    el.removeAttribute('data-processed');
    const src = el.getAttribute('data-mermaid-src');
    if (src) el.textContent = src;
  });
  runMermaid();
  localStorage.setItem('md-viewer-theme', theme);
}
function toggleTheme() { applyTheme(_currentTheme === 'dark' ? 'light' : 'dark'); }
// Apply saved theme on load
if (_currentTheme === 'light') applyTheme('light');

window.addEventListener('scroll', () => {
  const winH = document.documentElement.scrollHeight - window.innerHeight;
  document.getElementById('progressBar').style.width = (winH > 0 ? (window.scrollY / winH) * 100 : 0) + '%';
  const btn = document.getElementById('backToTop');
  window.scrollY > 300 ? btn.classList.add('visible') : btn.classList.remove('visible');
  updateScrollSpy();
});

document.addEventListener('click', (e) => {
  if (window.innerWidth <= 900) {
    const sb = document.getElementById('sidebar'), tg = document.querySelector('.menu-toggle');
    if (!sb.contains(e.target) && !tg.contains(e.target)) sb.classList.remove('open');
  }
});

// Keyboard nav
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '/' || e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    document.getElementById('search').focus();
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (activeFileIdx > 0) { e.preventDefault(); showFile(activeFileIdx - 1); }
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (activeFileIdx < FILES.length - 1) { e.preventDefault(); showFile(activeFileIdx + 1); }
  }
});

// Refresh file list every 3 seconds to pick up new/deleted/renamed files
setInterval(async () => {
  try {
    const resp = await fetch('/api/files');
    const data = await resp.json();
    const newPaths = data.files.map(f => f.path).join(',');
    const oldPaths = FILES.map(f => f.path).join(',');
    if (newPaths !== oldPaths) {
      FILES = data.files;
      renderNav();
      document.getElementById('fileCount').textContent = '(' + data.files.length + ')';
      if (activeFileIdx !== null && activeFileIdx < FILES.length) {
        document.getElementById('nav-' + activeFileIdx)?.classList.add('active');
      }
    }
  } catch {}
}, 3000);

init();
