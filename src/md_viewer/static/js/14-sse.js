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
      delete renderedViews[activeFileIdx];
      await showFile(activeFileIdx);
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

