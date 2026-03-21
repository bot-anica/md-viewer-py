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
  const headerSearch = document.getElementById('headerSearch');
  if (headerSearch && !headerSearch.contains(e.target)) {
    closeSearchDropdown();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    hideTabContextMenu();
    closeSearchDropdown();
  }
});

