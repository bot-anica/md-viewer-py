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
    bc.innerHTML = parts.map((p, i) => {
      const path = parts.slice(0, i + 1).join('/');
      return `<a class="bc-folder-link" onclick="showDashboard('${path}')">${p}</a>`;
    }).join('<span class="sep">/</span>') + `<span class="sep">/</span><span>${f.name}</span>`;
  } else {
    bc.innerHTML = `<span>${f.name}</span>`;
  }
  document.getElementById('breadcrumbBar').style.display = 'flex';

  buildToc();
  moveTocToPosition();
  addHeadingAnchors();
  interceptMdLinks(content, f.path);
  resolveImagePaths(content, f.path);
  runMermaid();

  // Tab management
  if (!openTabs.find(t => t.idx === idx)) openTabs.push({ idx, scrollPos: 0 });
  renderTabBar();
  document.body.scrollTo({ top: existingTab ? existingTab.scrollPos : 0 });

  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

