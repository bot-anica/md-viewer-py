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

function openShortcutsModal() {
  const overlay = document.getElementById('shortcutsOverlay');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function closeShortcutsModal() {
  const overlay = document.getElementById('shortcutsOverlay');
  overlay.classList.remove('show');
  overlay.addEventListener('transitionend', () => { overlay.style.display = 'none'; }, { once: true });
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

