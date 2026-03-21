let FILES = [];
let fileContents = {};
let activeFileIdx = null;

// ---- Tab state ----
let openTabs = []; // [{idx, scrollPos}]

// ---- Editor state ----
let isEditMode = false;
let easyMDE = null;
let originalContent = '';

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
  try {
    await mermaid.run({ nodes });
  } catch (e) {
    nodes.forEach(el => {
      if (!el.hasAttribute('data-processed')) {
        el.innerHTML = '<div style="border:1px solid #e74c3c;border-radius:6px;padding:12px;background:rgba(231,76,60,0.08);color:#e74c3c;font-size:13px;">'
          + '<strong>⚠ Diagram Error</strong><br>'
          + '<pre style="margin:8px 0 0;white-space:pre-wrap;color:inherit;font-size:12px;">' + (e.message || String(e)).replace(/</g, '&lt;') + '</pre>'
          + '</div>';
      }
    });
  }
}

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

// ---- Tab functions ----
function saveCurrentTabScroll() {
  if (activeFileIdx === null) return;
  const tab = openTabs.find(t => t.idx === activeFileIdx);
  if (tab) tab.scrollPos = document.body.scrollTop;
}

function renderTabBar() {
  const bar = document.getElementById('tabBar');
  if (!bar) return;
  if (openTabs.length === 0) {
    document.body.classList.remove('has-tabs');
    return;
  }
  document.body.classList.add('has-tabs');
  bar.innerHTML = openTabs.map(tab => {
    const f = FILES[tab.idx];
    const isActive = tab.idx === activeFileIdx;
    return `<div class="tab-item${isActive ? ' active' : ''}" id="tab-${tab.idx}" onclick="tabClick(event,${tab.idx})" onmousedown="tabMousedown(event,${tab.idx})" oncontextmenu="showTabContextMenu(event,${tab.idx})" title="${f.title}"><span class="tab-title">${f.name}</span><span class="tab-close" onclick="closeTab(event,${tab.idx})">&#x2715;</span></div>`;
  }).join('');
  const activeTabEl = document.getElementById('tab-' + activeFileIdx);
  if (activeTabEl) activeTabEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function tabClick(e, idx) {
  if (idx === activeFileIdx) return;
  saveCurrentTabScroll();
  showFile(idx);
}

function tabMousedown(e, idx) {
  if (e.button === 1) { e.preventDefault(); closeTab(e, idx); }
}

function closeTab(e, idx) {
  e.stopPropagation();
  const tabIdx = openTabs.findIndex(t => t.idx === idx);
  if (tabIdx < 0) return;
  openTabs.splice(tabIdx, 1);
  if (idx === activeFileIdx) {
    if (openTabs.length === 0) {
      showDashboard();
    } else {
      const nextTab = openTabs[Math.min(tabIdx, openTabs.length - 1)];
      showFile(nextTab.idx);
    }
  } else {
    renderTabBar();
  }
}

// ---- Tab context menu ----
let _ctxTabIdx = null;

function showTabContextMenu(e, idx) {
  e.preventDefault();
  e.stopPropagation();
  _ctxTabIdx = idx;
  const menu = document.getElementById('tabContextMenu');
  if (!menu) return;
  menu.style.display = 'block';
  const x = Math.min(e.clientX, window.innerWidth - menu.offsetWidth - 4);
  const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 4);
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

function hideTabContextMenu() {
  const menu = document.getElementById('tabContextMenu');
  if (menu) menu.style.display = 'none';
  _ctxTabIdx = null;
}

function tabCtxClose() {
  const idx = _ctxTabIdx;
  hideTabContextMenu();
  if (idx === null) return;
  const fakeEvent = { stopPropagation: () => {} };
  closeTab(fakeEvent, idx);
}

function tabCtxCloseOthers() {
  const keepIdx = _ctxTabIdx;
  hideTabContextMenu();
  if (keepIdx === null) return;
  openTabs = openTabs.filter(t => t.idx === keepIdx);
  if (activeFileIdx !== keepIdx) {
    showFile(keepIdx);
  } else {
    renderTabBar();
  }
}

function tabCtxCloseToRight() {
  const idx = _ctxTabIdx;
  hideTabContextMenu();
  if (idx === null) return;
  const pos = openTabs.findIndex(t => t.idx === idx);
  if (pos < 0) return;
  const removed = openTabs.splice(pos + 1);
  const removedIdxs = removed.map(t => t.idx);
  if (removedIdxs.includes(activeFileIdx)) {
    if (openTabs.length === 0) { showDashboard(); return; }
    showFile(openTabs[openTabs.length - 1].idx);
  } else {
    renderTabBar();
  }
}

function tabCtxCloseToLeft() {
  const idx = _ctxTabIdx;
  hideTabContextMenu();
  if (idx === null) return;
  const pos = openTabs.findIndex(t => t.idx === idx);
  if (pos < 0) return;
  const removed = openTabs.splice(0, pos);
  const removedIdxs = removed.map(t => t.idx);
  if (removedIdxs.includes(activeFileIdx)) {
    showFile(idx);
  } else {
    renderTabBar();
  }
}

function tabCtxCloseAll() {
  hideTabContextMenu();
  openTabs = [];
  showDashboard();
}

document.addEventListener('click', function(e) {
  const menu = document.getElementById('tabContextMenu');
  if (menu && menu.style.display !== 'none' && !menu.contains(e.target)) {
    hideTabContextMenu();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') hideTabContextMenu();
});

let _dashboardFolder = null; // null = root, string = subfolder path

function showDashboard(folder) {
  saveCurrentTabScroll();
  _dashboardFolder = folder || null;
  activeFileIdx = null;
  window.location.hash = '';
  document.body.classList.add('no-active-file');
  renderTabBar();

  // Hide file view elements
  document.getElementById('breadcrumbBar').style.display = 'none';
  document.getElementById('content').style.display = 'none';
  document.getElementById('editorWrapper').style.display = 'none';
  const tocContainer = document.getElementById('tocContainer');
  tocContainer.innerHTML = '';
  const useRight = _tocPosition === 'right' && window.innerWidth > 900;
  if (useRight) {
    tocContainer.innerHTML = `
      <div class="toc-toolbar">
        <div class="sidebar-section-label toc-toggle">On this page</div>
      </div>
      <div class="toc-empty-msg">Open a file to see its table of contents</div>`;
  }
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const loading = document.getElementById('loading');
  loading.style.display = 'none';

  // Build dashboard grid
  let dashboard = document.getElementById('dashboard');
  if (!dashboard) {
    dashboard = document.createElement('div');
    dashboard.id = 'dashboard';
    dashboard.className = 'dashboard';
    document.querySelector('.content-wrapper').appendChild(dashboard);
  }
  dashboard.style.display = 'block';
  dashboard.innerHTML = '';

  // Build folder/file structure for current level
  const tree = buildTree(FILES);
  let node = tree;
  let breadcrumbParts = [];

  if (folder) {
    const parts = folder.split('/');
    for (const part of parts) {
      if (node[part]) {
        node = node[part];
        breadcrumbParts.push(part);
      }
    }
  }

  // Breadcrumb navigation for dashboard
  if (breadcrumbParts.length > 0) {
    const bc = document.createElement('div');
    bc.className = 'dashboard-breadcrumb';
    let html = '<a class="dashboard-bc-link" onclick="showDashboard()">Home</a>';
    for (let i = 0; i < breadcrumbParts.length; i++) {
      const path = breadcrumbParts.slice(0, i + 1).join('/');
      html += '<span class="sep">/</span>';
      if (i < breadcrumbParts.length - 1) {
        html += `<a class="dashboard-bc-link" onclick="showDashboard('${path}')">${breadcrumbParts[i]}</a>`;
      } else {
        html += `<span>${breadcrumbParts[i]}</span>`;
      }
    }
    bc.innerHTML = html;
    dashboard.appendChild(bc);
  }

  const grid = document.createElement('div');
  grid.className = 'dashboard-grid';

  // Render folder cards
  const folderKeys = Object.keys(node).filter(k => k !== '_files').sort();
  folderKeys.forEach(name => {
    const count = countFiles(node[name]);
    const folderPath = folder ? folder + '/' + name : name;
    const card = document.createElement('div');
    card.className = 'dashboard-card dashboard-folder';
    card.onclick = () => showDashboard(folderPath);
    card.innerHTML = `
      <div class="dashboard-card-icon folder-icon-large">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
      </div>
      <div class="dashboard-card-name">${name}</div>
      <div class="dashboard-card-meta">${count} file${count !== 1 ? 's' : ''}</div>
    `;
    grid.appendChild(card);
  });

  // Render file cards
  if (node._files) {
    node._files.forEach(f => {
      const card = document.createElement('div');
      card.className = 'dashboard-card dashboard-file';
      card.onclick = () => showFile(f._idx);
      card.innerHTML = `
        <div class="dashboard-card-icon">
          ${buildFileIconSvg(f._idx)}
        </div>
        <div class="dashboard-card-name">${f.title}</div>
        <div class="dashboard-card-meta">${f.lines} lines</div>
      `;
      grid.appendChild(card);
    });
  }

  dashboard.appendChild(grid);
  document.body.scrollTo({ top: 0 });
}

async function loadFile(idx) {
  if (fileContents[idx] !== undefined) return fileContents[idx];
  const f = FILES[idx];
  try {
    const resp = await fetch('/files/' + f.path.split('/').map(encodeURIComponent).join('/'));
    if (!resp.ok) throw new Error(resp.status);
    fileContents[idx] = await resp.text();
  } catch {
    fileContents[idx] = `# Error loading ${f.path}`;
  }
  return fileContents[idx];
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
    header.className = 'tree-folder collapsed';
    header.style.paddingLeft = indent + 'px';
    header.innerHTML = `<span class="chevron"><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,2 10,2 5,8" fill="currentColor"/></svg></span><span class="folder-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg></span><span class="folder-name">${name}</span><span class="folder-count">${count}</span>`;

    const children = document.createElement('div');
    children.className = 'tree-children collapsed';

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

  item.innerHTML = `
    ${buildNavIconHtml(f._idx)}
    <div class="nav-details">
      <div class="nav-title">${f.title}</div>
      <div class="nav-meta">${f.name} &middot; ${f.lines} lines</div>
    </div>
  `;
  return item;
}

async function showFile(idx) {
  saveCurrentTabScroll();
  const existingTab = openTabs.find(t => t.idx === idx);

  // Hide dashboard
  const dashboard = document.getElementById('dashboard');
  if (dashboard) dashboard.style.display = 'none';

  // Skip re-render if clicking the same file while in edit mode
  if (isEditMode && idx === activeFileIdx) return;

  // Exit edit mode when switching files
  if (isEditMode) {
    const currentContent = easyMDE ? easyMDE.value() : '';
    if (currentContent !== originalContent) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    exitEditMode();
  }

  activeFileIdx = idx;
  document.body.classList.remove('no-active-file');
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

  // Lazy-load content on first view
  await loadFile(idx);

  const md = stripFrontmatter(fileContents[idx] || '');
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
  moveTocToPosition();
  addHeadingAnchors();
  interceptMdLinks(content, f.path);
  runMermaid();

  // Tab management
  if (!openTabs.find(t => t.idx === idx)) openTabs.push({ idx, scrollPos: 0 });
  renderTabBar();
  document.body.scrollTo({ top: existingTab ? existingTab.scrollPos : 0 });

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

      // Re-scan since DOM changed
      children.length = 0;
      children.push(...Array.from(container.children));
      i = children.indexOf(body) + 1;
    } else {
      // No content to wrap; advance past this heading to avoid infinite loop
      i++;
    }
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

let _sidebarTocExpanded = false;

function buildToc() {
  const container = document.getElementById('tocContainer');
  container.innerHTML = '';
  tocHeadings = [];

  const inRightPanel = _tocPosition === 'right' && window.innerWidth > 900;

  // Toolbar with collapsible "On this page" header
  const toolbar = document.createElement('div');
  toolbar.className = 'toc-toolbar';
  const tocCollapserBtn = inRightPanel
    ? `<button class="toc-panel-collapser" onclick="toggleTocCollapse()" title="Collapse TOC panel"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,18 15,12 9,6"/></svg></button>`
    : '';
  const tocIsExpanded = inRightPanel ? true : _sidebarTocExpanded;
  toolbar.innerHTML = `
    <div class="sidebar-section-label toc-toggle">
      <span class="toc-header-chevron${tocIsExpanded ? '' : ' collapsed'}">&#9660;</span>On this page
    </div>
    <div class="toc-btns">
      <button class="collapse-btn" onclick="tocCollapseAll()" title="Collapse TOC"><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="2,0 8,5 2,10" fill="currentColor"/></svg></button>
      <button class="collapse-btn" onclick="tocExpandAll()" title="Expand TOC"><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,2 10,2 5,8" fill="currentColor"/></svg></button>
      ${tocCollapserBtn}
    </div>
  `;
  container.appendChild(toolbar);

  // Content wrapper — preserve expanded state across file switches
  const tocContent = document.createElement('div');
  tocContent.className = 'toc-content' + (tocIsExpanded ? '' : ' collapsed');
  container.appendChild(tocContent);
  if (tocIsExpanded) container.classList.add('toc-expanded');

  // Toggle toc-content on "On this page" label click (disabled in right panel)
  const toggleLabel = toolbar.querySelector('.toc-toggle');
  const headerChevron = toolbar.querySelector('.toc-header-chevron');
  toggleLabel.onclick = () => {
    const inRightPanel = document.getElementById('tocRightPanel')?.contains(container);
    if (inRightPanel) return;
    tocContent.classList.toggle('collapsed');
    headerChevron.classList.toggle('collapsed');
    container.classList.toggle('toc-expanded');
    _sidebarTocExpanded = !_sidebarTocExpanded;
  };

  const headings = document.querySelectorAll('.md h2, .md h3');
  let currentGroup = null;
  let currentChildren = null;
  let currentH2Entry = null;

  const usedSlugs = new Set();
  headings.forEach((h) => {
    const slug = slugifyHeading(h.textContent, usedSlugs);
    h.id = slug;

    if (h.tagName === 'H2') {
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
      tocContent.appendChild(group);

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
        tocContent.appendChild(h3Link);
      }

      tocHeadings.push({ el: h, slug, level: 3, tocEl: h3Link, parentH2: currentH2Entry });
    }
  });

  // Replace chevron with spacer for H2s that have no H3 children (Change 1)
  tocHeadings.forEach(entry => {
    if (entry.level !== 2) return;
    if (!entry.childrenEl || entry.childrenEl.children.length === 0) {
      const chevron = entry.tocEl.querySelector('.toc-chevron');
      if (chevron) {
        const spacer = document.createElement('span');
        spacer.className = 'toc-chevron-spacer';
        chevron.replaceWith(spacer);
      }
    }
  });

  // Empty state: no headings found in right panel mode
  if (tocHeadings.length === 0 && inRightPanel) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'toc-empty-msg';
    emptyMsg.textContent = 'No headings in this file';
    container.appendChild(emptyMsg);
  }

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

let _searchDebounce = null;
function handleSearch(query) {
  const results = document.getElementById('searchResults');
  if (query.length < 2) { results.classList.remove('active'); results.innerHTML = ''; return; }

  clearTimeout(_searchDebounce);
  _searchDebounce = setTimeout(() => _doSearch(query), 200);
}

async function _doSearch(query) {
  const results = document.getElementById('searchResults');
  if (query.length < 2) { results.classList.remove('active'); results.innerHTML = ''; return; }

  // Load all files that haven't been fetched yet
  const unloaded = FILES.map((f, i) => fileContents[i] === undefined ? i : null).filter(i => i !== null);
  if (unloaded.length > 0) {
    results.innerHTML = '<div style="padding:6px 10px;font-size:12px;color:var(--text-muted)">Loading files...</div>';
    results.classList.add('active');
    await Promise.all(unloaded.map(i => loadFile(i)));
  }

  const q = query.toLowerCase();
  let items = [];
  FILES.forEach((f, idx) => {
    const text = stripFrontmatter(fileContents[idx] || '');
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
  document.body.scrollTo({ top: content.offsetTop + content.scrollHeight * pct - 100, behavior: 'smooth' });
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
  const usedSlugs = new Set();
  document.querySelectorAll('.md h1, .md h2, .md h3, .md h4').forEach(h => {
    if (h.querySelector('.heading-anchor')) return;
    if (h.id) { usedSlugs.add(h.id); }
    const id = h.id || slugifyHeading(h.textContent, usedSlugs);
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

document.body.addEventListener('scroll', () => {
  const winH = document.body.scrollHeight - document.body.clientHeight;
  document.getElementById('progressBar').style.width = (winH > 0 ? (document.body.scrollTop / winH) * 100 : 0) + '%';
  const btn = document.getElementById('backToTop');
  document.body.scrollTop > 300 ? btn.classList.add('visible') : btn.classList.remove('visible');
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
  // Disable file navigation keys when in edit mode
  if (isEditMode) return;
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

// Live reload via Server-Sent Events
let _sseRetries = 0;
const _SSE_MAX_RETRIES = 3;

function showServerStopped() {
  if (document.getElementById('serverStoppedBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'serverStoppedBanner';
  banner.className = 'server-stopped';
  banner.innerHTML = 'Server has been stopped. Restart with <code>mdview</code> and refresh the page.';
  document.body.appendChild(banner);
}

function hideServerStopped() {
  const banner = document.getElementById('serverStoppedBanner');
  if (banner) banner.remove();
}

function connectSSE() {
  const es = new EventSource('/api/events');
  es.onopen = () => {
    _sseRetries = 0;
    hideServerStopped();
  };
  es.onmessage = async () => {
    // Refresh file list
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
    // Reload currently viewed file (skip if editing)
    if (activeFileIdx !== null && !isEditMode) {
      delete fileContents[activeFileIdx];
      await loadFile(activeFileIdx);
      const md = stripFrontmatter(fileContents[activeFileIdx] || '');
      const html = marked.parse(md, { gfm: true, breaks: false });
      const content = document.getElementById('content');
      content.innerHTML = html;
      makeSectionsCollapsible(content);
      content.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
      addCopyButtons(content);
      addHeadingAnchors();
      const f = FILES[activeFileIdx];
      if (f) interceptMdLinks(content, f.path);
      buildToc();
      runMermaid();
    }
  };
  es.onerror = () => {
    es.close();
    _sseRetries++;
    if (_sseRetries >= _SSE_MAX_RETRIES) {
      showServerStopped();
    }
    setTimeout(connectSSE, 3000);
  };
}
connectSSE();

// ---- Editor functions ----
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.includes('Mac');

function toggleEditMode() {
  if (activeFileIdx === null) return;

  if (!isEditMode) {
    enterEditMode();
  } else {
    exitEditMode();
  }
}

function enterEditMode() {
  if (activeFileIdx === null) return;

  const content = document.getElementById('content');
  const editorWrapper = document.getElementById('editorWrapper');
  const editBtn = document.getElementById('editBtn');

  // Get current file content
  const f = FILES[activeFileIdx];
  originalContent = fileContents[activeFileIdx] || '';

  // Hide content, show editor
  content.style.display = 'none';
  editorWrapper.style.display = 'block';
  editBtn.classList.add('active');
  editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg> View';

  // Initialize EasyMDE
  const textarea = document.getElementById('editor');
  textarea.value = originalContent;

  easyMDE = new EasyMDE({
    element: textarea,
    initialValue: originalContent,
    autofocus: true,
    spellChecker: false,
    status: ['autosave', 'lines', 'words'],
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'code', 'link', 'image', '|',
      'unordered-list', 'ordered-list', '|',
      'preview', '|',
      {
        name: 'save',
        action: saveFile,
        className: 'fa fa-floppy-o',
        title: 'Save (' + (isMac ? 'Cmd' : 'Ctrl') + '+S)',
      }
    ],
    previewRender: (plainText) => {
      return marked.parse(stripFrontmatter(plainText), { gfm: true, breaks: false });
    }
  });

  // Bind Ctrl+S to save
  easyMDE.codemirror.on('keydown', (cm, event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      saveFile();
    }
  });

  // Update status on change
  easyMDE.codemirror.on('change', () => {
    updateEditorStatus();
  });

  isEditMode = true;
  updateEditorStatus();
  updateSaveBtn();
}

function exitEditMode() {
  const content = document.getElementById('content');
  const editorWrapper = document.getElementById('editorWrapper');
  const editBtn = document.getElementById('editBtn');

  // Check for unsaved changes
  const currentContent = easyMDE ? easyMDE.value() : '';
  if (currentContent !== originalContent) {
    if (!confirm('You have unsaved changes. Discard them?')) {
      return;
    }
  }

  // Clean up editor
  if (easyMDE) {
    easyMDE.toTextArea();
    easyMDE = null;
  }

  // Show content, hide editor
  editorWrapper.style.display = 'none';
  content.style.display = 'block';
  editBtn.classList.remove('active');
  editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> Edit';

  isEditMode = false;

  // Refresh content
  showFile(activeFileIdx);
}

async function saveFile() {
  if (!easyMDE || activeFileIdx === null) return;

  const f = FILES[activeFileIdx];
  const content = easyMDE.value();
  const statusEl = document.getElementById('editorStatus');

  // Don't save if nothing changed
  if (content === originalContent) {
    statusEl.innerHTML = '<span style="color:var(--text-muted)">No changes to save</span>';
    setTimeout(() => { statusEl.innerHTML = ''; }, 1500);
    return;
  }

  statusEl.innerHTML = '<span style="color:var(--accent)">⏳ Saving...</span>';

  try {
    const resp = await fetch('/files/' + f.path.split('/').map(encodeURIComponent).join('/'), {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: content
    });

    if (resp.ok) {
      originalContent = content;
      fileContents[activeFileIdx] = content;
      exitEditMode();
      showToast('File saved successfully');
    } else {
      const err = await resp.text();
      statusEl.innerHTML = `<span class="error">✗ Save failed: ${resp.status}</span>`;
    }
  } catch (e) {
    statusEl.innerHTML = `<span class="error">✗ Network error: ${e.message || 'Unknown error'}</span>`;
  }
}

function updateEditorStatus() {
  if (!easyMDE) return;
  const currentContent = easyMDE.value();
  const statusEl = document.getElementById('editorStatus');
  const isDirty = currentContent !== originalContent;

  const modKey = isMac ? 'Cmd' : 'Ctrl';
  const msg = isDirty ? '<span class="dirty">● Modified (' + modKey + '+S to save)</span>' : '';
  if (statusEl) statusEl.innerHTML = msg;
  updateSaveBtn();
}

function updateSaveBtn() {
  if (!easyMDE) return;
  const isDirty = easyMDE.value() !== originalContent;
  const btn = document.getElementById('editorSaveBtn');
  if (btn) btn.disabled = !isDirty;
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML = (type === 'success'
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>')
    + '<span>' + message + '</span>';
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 5000);
}

// ---- What's New modal ----
async function checkWhatsNew() {
  try {
    const resp = await fetch('/api/version');
    if (!resp.ok) return;
    const data = await resp.json();
    const lastSeen = localStorage.getItem('mdviewer_last_version');
    if (lastSeen === data.version) return;
    if (!data.release_notes) {
      localStorage.setItem('mdviewer_last_version', data.version);
      return;
    }
    const notes = data.release_notes.replace(/^##?\s+What'?s\s+New\s*/im, '');
    document.getElementById('whatsNewBody').innerHTML = marked.parse(notes, { gfm: true, breaks: false });
    document.getElementById('whatsNewVersion').textContent = 'v' + data.version;
    const overlay = document.getElementById('whatsNewOverlay');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('show'));
    localStorage.setItem('mdviewer_last_version', data.version);
  } catch {}
}

function closeWhatsNew() {
  const overlay = document.getElementById('whatsNewOverlay');
  overlay.classList.remove('show');
  overlay.addEventListener('transitionend', () => { overlay.style.display = 'none'; }, { once: true });
}

// ---- Update notification modal ----
async function checkUpdateNotif() {
  try {
    const resp = await fetch('/api/version');
    if (!resp.ok) return;
    const data = await resp.json();
    if (!data.latest_version || !data.version) return;
    if (data.latest_version === data.version) return;
    // Simple version comparison: show if latest_version > version
    const parse = v => v.split('.').map(Number);
    const cur = parse(data.version);
    const lat = parse(data.latest_version);
    for (let i = 0; i < Math.max(cur.length, lat.length); i++) {
      const a = cur[i] || 0, b = lat[i] || 0;
      if (b > a) break;
      if (b < a) return; // current is somehow newer, skip
    }
    const dismissed = localStorage.getItem('mdviewer_update_dismissed');
    if (dismissed === data.latest_version) return;
    document.getElementById('updateNotifLatestVersion').textContent = 'v' + data.latest_version;
    document.getElementById('updateNotifCurrentVersion').textContent = 'v' + data.version;
    const overlay = document.getElementById('updateNotifOverlay');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('show'));
  } catch {}
}

function closeUpdateNotif() {
  const overlay = document.getElementById('updateNotifOverlay');
  const latestEl = document.getElementById('updateNotifLatestVersion');
  const latest = latestEl ? latestEl.textContent.replace(/^v/, '') : '';
  if (latest) localStorage.setItem('mdviewer_update_dismissed', latest);
  overlay.classList.remove('show');
  overlay.addEventListener('transitionend', () => { overlay.style.display = 'none'; }, { once: true });
}

// ---- Sidebar collapse ----
let _sidebarCollapsed = localStorage.getItem('mdviewer_sidebar_collapsed') === 'true';
function toggleSidebarCollapse() {
  _sidebarCollapsed = !_sidebarCollapsed;
  localStorage.setItem('mdviewer_sidebar_collapsed', _sidebarCollapsed);
  document.body.classList.toggle('sidebar-collapsed', _sidebarCollapsed);
}

// ---- TOC right panel collapse ----
let _tocCollapsed = localStorage.getItem('mdviewer_toc_collapsed') === 'true';
function toggleTocCollapse() {
  _tocCollapsed = !_tocCollapsed;
  localStorage.setItem('mdviewer_toc_collapsed', _tocCollapsed);
  document.body.classList.toggle('toc-collapsed', _tocCollapsed);
}

// ---- Settings ----
function initSettings() {
  if (_iconStyle === 'monochrome') document.body.classList.add('monochrome-icons');
  if (_sidebarCollapsed) document.body.classList.add('sidebar-collapsed');
  if (_tocCollapsed) document.body.classList.add('toc-collapsed');
  document.body.classList.add('no-active-file');
  const isMobile = window.innerWidth <= 900;
  if (_tocPosition === 'right' && !isMobile) {
    document.body.classList.add('toc-right');
    moveTocToPosition();
  }
}

function moveTocToPosition() {
  const tocContainer = document.getElementById('tocContainer');
  const rightPanel = document.getElementById('tocRightPanel');
  const sidebar = document.getElementById('sidebar');
  if (!tocContainer || !rightPanel || !sidebar) return;
  const useRight = _tocPosition === 'right' && window.innerWidth > 900;
  if (useRight && !rightPanel.contains(tocContainer)) {
    rightPanel.appendChild(tocContainer);
  } else if (!useRight && !sidebar.contains(tocContainer)) {
    sidebar.appendChild(tocContainer);
  }
  // Force TOC expanded when in right panel
  if (useRight) {
    const tocContent = tocContainer.querySelector('.toc-content');
    const headerChevron = tocContainer.querySelector('.toc-header-chevron');
    if (tocContent) tocContent.classList.remove('collapsed');
    if (headerChevron) headerChevron.classList.remove('collapsed');
    tocContainer.classList.add('toc-expanded');
  }
}

function openSettings() {
  const overlay = document.getElementById('settingsOverlay');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('show'));
  document.querySelector(`input[name="iconStyle"][value="${_iconStyle}"]`).checked = true;
  document.querySelector(`input[name="tocPosition"][value="${_tocPosition}"]`).checked = true;
}

function closeSettings() {
  const overlay = document.getElementById('settingsOverlay');
  overlay.classList.remove('show');
  overlay.addEventListener('transitionend', () => { overlay.style.display = 'none'; }, { once: true });
}

function applyIconStyle(style) {
  _iconStyle = style;
  localStorage.setItem('mdviewer_icon_style', style);
  document.body.classList.toggle('monochrome-icons', style === 'monochrome');
  const expandedFolders = new Set();
  document.querySelectorAll('#navItems .tree-folder').forEach(h => {
    if (!h.classList.contains('collapsed')) {
      const name = h.querySelector('.folder-name')?.textContent;
      if (name) expandedFolders.add(name);
    }
  });
  renderNav();
  if (expandedFolders.size > 0) {
    document.querySelectorAll('#navItems .tree-folder').forEach(h => {
      const name = h.querySelector('.folder-name')?.textContent;
      if (name && expandedFolders.has(name)) {
        h.classList.remove('collapsed');
        const children = h.nextElementSibling;
        if (children && children.classList.contains('tree-children')) {
          children.classList.remove('collapsed');
        }
      }
    });
  }
  if (activeFileIdx !== null) {
    document.getElementById('nav-' + activeFileIdx)?.classList.add('active');
  }
  const dashboard = document.getElementById('dashboard');
  if (dashboard && dashboard.style.display !== 'none') {
    showDashboard(_dashboardFolder);
  }
}

function applyTocPosition(pos) {
  _tocPosition = pos;
  localStorage.setItem('mdviewer_toc_position', pos);
  const isMobile = window.innerWidth <= 900;
  document.body.classList.toggle('toc-right', pos === 'right' && !isMobile);
  moveTocToPosition();
}

window.addEventListener('resize', () => {
  const isMobile = window.innerWidth <= 900;
  document.body.classList.toggle('toc-right', _tocPosition === 'right' && !isMobile);
  moveTocToPosition();
});

// ---- Print: set document title to active filename ----
let _savedTitle = '';
window.addEventListener('beforeprint', () => {
  _savedTitle = document.title;
  if (activeFileIdx !== null && FILES[activeFileIdx]) {
    document.title = FILES[activeFileIdx].title || FILES[activeFileIdx].name;
  }
});
window.addEventListener('afterprint', () => {
  document.title = _savedTitle;
});

initSettings();
init();
checkWhatsNew();
checkUpdateNotif();
