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
  // In-file search input handles its own keys
  if (e.target.id === 'infileSearchInput') return;

  // Don't intercept when typing in other inputs/textareas
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // Disable file navigation keys when in edit mode
  if (isEditMode) return;

  // Cmd+F / Ctrl+F → in-file search
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    openInfileSearch();
    return;
  }

  // Cmd+Shift+F / Ctrl+Shift+F → global header search
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    document.getElementById('search').focus();
    return;
  }

  // / or Cmd+K → focus header search
  if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
    e.preventDefault();
    document.getElementById('search').focus();
    return;
  }

  // Alt+Left / Alt+Right → navigation history back/forward
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    navBack();
    return;
  }
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    navForward();
    return;
  }

  // Arrow keys for file navigation
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (activeFileIdx > 0) { e.preventDefault(); showFile(activeFileIdx - 1); }
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (activeFileIdx < FILES.length - 1) { e.preventDefault(); showFile(activeFileIdx + 1); }
  }

  // Escape to close in-file search or shortcuts modal
  if (e.key === 'Escape') {
    const shortcutsOverlay = document.getElementById('shortcutsOverlay');
    if (shortcutsOverlay && shortcutsOverlay.classList.contains('show')) {
      closeShortcutsModal();
      return;
    }
    if (_infileSearchOpen) closeInfileSearch();
  }

  // ? → toggle shortcuts modal
  if (e.key === '?') {
    e.preventDefault();
    const shortcutsOverlay = document.getElementById('shortcutsOverlay');
    if (shortcutsOverlay && shortcutsOverlay.classList.contains('show')) {
      closeShortcutsModal();
    } else {
      openShortcutsModal();
    }
  }
});

// Shift+Shift (double-tap within 300ms) → focus sidebar file filter
let _lastShiftTime = 0;
document.addEventListener('keyup', function(e) {
  if (e.key === 'Shift' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const now = Date.now();
    if (now - _lastShiftTime < 300) {
      _lastShiftTime = 0;
      // Expand sidebar if collapsed
      if (_sidebarCollapsed) {
        _sidebarCollapsed = false;
        localStorage.setItem('mdviewer_sidebar_collapsed', 'false');
        document.body.classList.remove('sidebar-collapsed');
      }
      // On mobile, open sidebar
      if (window.innerWidth <= 900) {
        document.getElementById('sidebar').classList.add('open');
      }
      document.getElementById('fileFilterInput').focus();
    } else {
      _lastShiftTime = now;
    }
  }
});

