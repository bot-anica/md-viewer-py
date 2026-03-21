// ---- Configure marked with mermaid renderer ----
marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang === 'mermaid') {
        return '<div class="mermaid">' + text + '</div>';
      }
      return false; // fall back to default
    }
  }
});

// ---- Mermaid init ----
let _mermaidTheme = 'dark';
function initMermaid(theme) {
  _mermaidTheme = theme;
  mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default' });
}
initMermaid('dark');

async function runMermaid() {
  const nodes = document.querySelectorAll('.mermaid:not([data-processed])');
  if (nodes.length === 0) return;
  nodes.forEach(el => { if (!el.hasAttribute('data-mermaid-src')) el.setAttribute('data-mermaid-src', el.textContent); });
  try {
    await mermaid.run({ nodes });
  } catch (e) {
    nodes.forEach(el => {
      if (!el.hasAttribute('data-processed')) {
        el.innerHTML = '<div style="border:1px solid #e74c3c;border-radius:6px;padding:12px;background:rgba(231,76,60,0.08);color:#e74c3c;font-size:13px;">'
          + '<strong>⚠ Diagram Error</strong><br>'
          + '<pre style="margin:8px 0 0;white-space:pre-wrap;color:inherit;font-size:12px;">' + (e.message || String(e)).replace(/</g, '&lt;') + '</pre>'
          + '</div>';
      }
    });
  }
}

