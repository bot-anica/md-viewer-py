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
      if (f) resolveImagePaths(content, f.path);
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

