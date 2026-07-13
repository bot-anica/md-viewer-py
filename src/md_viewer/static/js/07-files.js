let _navSkipHistory = false;

function _pushNavHistory(idx) {
  if (_navSkipHistory) return;
  // If we're not at the end of history, truncate forward entries
  if (_navHistoryPos < _navHistory.length - 1) {
    _navHistory = _navHistory.slice(0, _navHistoryPos + 1);
  }
  // Don't push duplicate consecutive entries
  if (_navHistory.length === 0 || _navHistory[_navHistory.length - 1] !== idx) {
    _navHistory.push(idx);
  }
  _navHistoryPos = _navHistory.length - 1;
  _updateNavButtons();
}

function _updateNavButtons() {
  const back = document.getElementById('navBackBtn');
  const fwd = document.getElementById('navForwardBtn');
  if (back) back.disabled = _navHistoryPos <= 0;
  if (fwd) fwd.disabled = _navHistoryPos >= _navHistory.length - 1;
}

function navBack() {
  if (_navHistoryPos <= 0) return;
  _navHistoryPos--;
  _navSkipHistory = true;
  showFile(_navHistory[_navHistoryPos]);
  _navSkipHistory = false;
  _updateNavButtons();
}

function navForward() {
  if (_navHistoryPos >= _navHistory.length - 1) return;
  _navHistoryPos++;
  _navSkipHistory = true;
  showFile(_navHistory[_navHistoryPos]);
  _navSkipHistory = false;
  _updateNavButtons();
}

async function showFile(idx) {
  saveCurrentTabScroll();
  closeInfileSearch();
  const existingTab = openTabs.find(t => t.idx === idx);

  // Hide dashboard and search view
  const dashboard = document.getElementById('dashboard');
  if (dashboard) dashboard.style.display = 'none';
  const svp = document.getElementById('searchViewPanel');
  if (svp) svp.style.display = 'none';

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
  _pushNavHistory(idx);
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

  const content = document.getElementById('content');
  let view = renderedViews[idx];
  if (!view) {
    const md = stripFrontmatter(fileContents[idx] || '');
    const html = safeMarked(md);
    view = document.createElement('div');
    view.innerHTML = html;
    makeSectionsCollapsible(view);
    view.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
    addCopyButtons(view);
    renderedViews[idx] = view;
    // Attach before addHeadingAnchors/buildToc — they query `.md h1..h4`
    // against the document, relying on #content's "md" class as ancestor.
    content.replaceChildren(view);
    addHeadingAnchors();
    interceptMdLinks(view, f.path);
    resolveWikiLinks(view, f.path);
    resolveImagePaths(view, f.path);
    convertAudioImages(view);
    convertImageTablesToSliders(view);
    wrapStandaloneImages(view);
  } else {
    content.replaceChildren(view);
  }
  content.style.display = 'block';
  document.getElementById('loading').style.display = 'none';

  // Breadcrumb bar (file name + collapse/expand)
  const bc = document.getElementById('breadcrumb');
  if (f.folder) {
    const parts = f.folder.split('/');
    bc.innerHTML = parts.map((p, i) => {
      const path = parts.slice(0, i + 1).join('/');
      return `<a class="bc-folder-link" onclick="showDashboard('${escapeJsString(path)}')">${escapeHtml(p)}</a>`;
    }).join('<span class="sep">/</span>') + `<span class="sep">/</span><span>${escapeHtml(f.name)}</span>`;
  } else {
    bc.innerHTML = `<span>${escapeHtml(f.name)}</span>`;
  }
  document.getElementById('breadcrumbBar').style.display = 'flex';

  buildToc();
  moveTocToPosition();
  runMermaid();

  // Tab management
  if (!openTabs.find(t => t.idx === idx)) openTabs.push({ idx, scrollPos: 0 });
  renderTabBar();
  document.body.scrollTo({ top: existingTab ? existingTab.scrollPos : 0 });

  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

