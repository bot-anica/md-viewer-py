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

