// ---- Print: set document title to active filename ----
// ---- Keyboard shortcut hint badges ----
function initKbdHints() {
  const searchHint = document.getElementById('searchKbdHint');
  const filterHint = document.getElementById('filterKbdHint');
  const searchInput = document.getElementById('search');
  const filterInput = document.getElementById('fileFilterInput');

  if (searchHint) {
    const mod = isMac ? '⌘' : 'Ctrl';
    searchHint.innerHTML = `<kbd class="kbd-badge">${mod}</kbd><kbd class="kbd-badge">⇧</kbd><kbd class="kbd-badge">F</kbd>`;
  }

  function setHintVisibility(hint, input) {
    if (!hint || !input) return;
    const hide = document.activeElement === input || input.value.length > 0;
    hint.classList.toggle('hidden', hide);
  }

  [
    { hint: searchHint, input: searchInput },
    { hint: filterHint, input: filterInput },
  ].forEach(({ hint, input }) => {
    if (!hint || !input) return;
    input.addEventListener('focus', () => hint.classList.add('hidden'));
    input.addEventListener('blur', () => setHintVisibility(hint, input));
    input.addEventListener('input', () => setHintVisibility(hint, input));
  });
}

let _savedTitle = '';
window.addEventListener('beforeprint', () => {
  _savedTitle = document.title;
  if (activeFileIdx !== null && FILES[activeFileIdx]) {
    document.title = FILES[activeFileIdx].title || FILES[activeFileIdx].name;
  }
});
window.addEventListener('afterprint', () => {
  document.title = _savedTitle;
});

initSettings();
init();
checkWhatsNew();
initKbdHints();
checkUpdateNotif();
// Set platform-specific modifier key in shortcuts modal
document.querySelectorAll('.kbd-mod').forEach(el => { el.textContent = isMac ? '⌘' : 'Ctrl'; });
