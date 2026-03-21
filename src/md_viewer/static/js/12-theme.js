function _getDefaultTheme() {
  const saved = localStorage.getItem('md-viewer-theme');
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
let _currentTheme = _getDefaultTheme();
function applyTheme(theme) {
  _currentTheme = theme;
  document.body.classList.toggle('light', theme === 'light');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = theme === 'dark'
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><circle cx="12" cy="12" r="5"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></g></svg> Light'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark';
  const darkCss = document.getElementById('hljs-dark-css');
  const lightCss = document.getElementById('hljs-light-css');
  if (darkCss) darkCss.disabled = theme === 'light';
  if (lightCss) lightCss.disabled = theme === 'dark';
  initMermaid(theme);
  // Re-render mermaid diagrams with new theme
  document.querySelectorAll('.mermaid[data-processed]').forEach(el => {
    el.removeAttribute('data-processed');
    const src = el.getAttribute('data-mermaid-src');
    if (src) el.textContent = src;
  });
  runMermaid();
  localStorage.setItem('md-viewer-theme', theme);
}
function toggleTheme() { applyTheme(_currentTheme === 'dark' ? 'light' : 'dark'); }
// Apply theme on load (uses OS preference if no saved preference)
applyTheme(_currentTheme);

