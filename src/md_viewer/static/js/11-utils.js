function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function interceptMdLinks(container, currentFilePath) {
  container.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      return;
    }
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

function resolveImagePaths(container, currentFilePath) {
  const dir = currentFilePath && currentFilePath.includes('/')
    ? currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))
    : '';
  container.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    if (!src || /^https?:\/\//.test(src) || src.startsWith('data:') || src.startsWith('/')) return;
    const raw = dir ? dir + '/' + src : src;
    const parts = raw.split('/');
    const norm = [];
    for (const p of parts) {
      if (p === '..') norm.pop();
      else if (p !== '.') norm.push(p);
    }
    img.src = '/files-raw/' + norm.join('/');
  });
}

function wrapStandaloneImages(container) {
  container.querySelectorAll('img').forEach(img => {
    if (img.closest('.md-slider')) return;
    if (img.parentNode.classList.contains('md-img-wrap')) return;

    const doWrap = () => {
      // Skip small images (badges, icons, logos)
      if (img.naturalWidth < 200 || img.naturalHeight < 100) return;
      const ratio = img.naturalWidth / img.naturalHeight;
      const wrap = document.createElement('div');
      // Wide images (wider than 16:9 ≈ 1.78) keep natural size
      if (ratio > 1.78) {
        wrap.className = 'md-img-wrap md-img-natural';
      } else {
        wrap.className = 'md-img-wrap';
      }
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
    };

    if (img.naturalWidth) {
      doWrap();
    } else {
      img.addEventListener('load', doWrap, { once: true });
    }
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

function resolveWikiLinks(container, currentFilePath) {
  const links = container.querySelectorAll('a.wiki-link');
  if (links.length === 0) return;

  // Build lookup maps once
  const byPath = new Map();
  const byName = new Map();
  FILES.forEach((f, i) => {
    byPath.set(f.path, i);
    byPath.set(f.path.replace(/\.md$/i, ''), i);
    const name = f.name.toLowerCase().replace(/\.md$/i, '');
    if (!byName.has(name)) byName.set(name, i);
  });

  const dir = currentFilePath && currentFilePath.includes('/')
    ? currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))
    : '';

  links.forEach(a => {
    const raw = a.getAttribute('data-wiki-target');
    if (!raw) return;
    const [filePart, heading] = raw.split('#', 2);
    const target = filePart || '';

    // Resolution order: exact path, relative path, filename match
    let idx = byPath.get(target);
    if (idx === undefined) idx = byPath.get(target + '.md');
    if (idx === undefined && dir) {
      const rel = dir + '/' + target;
      idx = byPath.get(rel);
      if (idx === undefined) idx = byPath.get(rel + '.md');
    }
    if (idx === undefined) idx = byName.get(target.toLowerCase().replace(/\.md$/i, ''));

    if (idx !== undefined) {
      a.addEventListener('click', e => {
        e.preventDefault();
        if (idx === activeFileIdx && !heading) {
          // Self-link without heading — scroll to top
          document.body.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        showFile(idx);
        if (heading) {
          setTimeout(() => {
            const el = document.getElementById(heading) || document.getElementById(slugifyHeading(heading, new Set()));
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      });
    } else {
      a.classList.add('wiki-link-broken');
      a.title = 'Page not found: ' + raw;
    }
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

