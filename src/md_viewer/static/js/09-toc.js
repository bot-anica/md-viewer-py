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

