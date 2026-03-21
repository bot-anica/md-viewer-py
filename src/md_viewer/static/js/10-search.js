// ---- In-file search functions ----
function openInfileSearch() {
  if (activeFileIdx === null) return;
  _infileSearchOpen = true;
  const bar = document.getElementById('infileSearchBar');
  bar.style.display = 'flex';
  document.body.classList.add('infile-search-open');
  const input = document.getElementById('infileSearchInput');
  input.focus();
  input.select();
}

function closeInfileSearch() {
  _infileSearchOpen = false;
  document.getElementById('infileSearchBar').style.display = 'none';
  document.body.classList.remove('infile-search-open');
  document.getElementById('infileSearchInput').value = '';
  document.getElementById('infileSearchCount').textContent = '';
  clearInfileHighlights();
}

function clearInfileHighlights() {
  _infileMatches = [];
  _infileActiveIdx = -1;
  const content = document.getElementById('content');
  content.querySelectorAll('mark.infile-match, mark.infile-match-active').forEach(mark => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}

function handleInfileSearch(query) {
  clearInfileHighlights();
  const countEl = document.getElementById('infileSearchCount');
  if (!query || query.length < 1) { countEl.textContent = ''; return; }

  const content = document.getElementById('content');
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  const lowerQuery = query.toLowerCase();
  textNodes.forEach(node => {
    const text = node.textContent;
    const lowerText = text.toLowerCase();
    if (!lowerText.includes(lowerQuery)) return;

    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    let idx = lowerText.indexOf(lowerQuery, lastIdx);
    while (idx !== -1) {
      if (idx > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
      const mark = document.createElement('mark');
      mark.className = 'infile-match';
      mark.textContent = text.slice(idx, idx + query.length);
      frag.appendChild(mark);
      lastIdx = idx + query.length;
      idx = lowerText.indexOf(lowerQuery, lastIdx);
    }
    if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    node.parentNode.replaceChild(frag, node);
  });

  _infileMatches = Array.from(content.querySelectorAll('mark.infile-match'));
  if (_infileMatches.length > 0) {
    _infileActiveIdx = 0;
    _infileMatches[0].classList.remove('infile-match');
    _infileMatches[0].classList.add('infile-match-active');
    _infileMatches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    countEl.textContent = '1 of ' + _infileMatches.length;
  } else {
    countEl.textContent = query.length > 0 ? 'No results' : '';
  }
}

function navigateInfileMatch(direction) {
  if (_infileMatches.length === 0) return;

  if (_infileActiveIdx >= 0 && _infileActiveIdx < _infileMatches.length) {
    _infileMatches[_infileActiveIdx].classList.remove('infile-match-active');
    _infileMatches[_infileActiveIdx].classList.add('infile-match');
  }

  _infileActiveIdx += direction;
  if (_infileActiveIdx >= _infileMatches.length) _infileActiveIdx = 0;
  if (_infileActiveIdx < 0) _infileActiveIdx = _infileMatches.length - 1;

  _infileMatches[_infileActiveIdx].classList.remove('infile-match');
  _infileMatches[_infileActiveIdx].classList.add('infile-match-active');
  _infileMatches[_infileActiveIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });

  document.getElementById('infileSearchCount').textContent =
    (_infileActiveIdx + 1) + ' of ' + _infileMatches.length;
}

function handleInfileSearchKeydown(e) {
  if (e.key === 'Escape') {
    closeInfileSearch();
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    navigateInfileMatch(e.shiftKey ? -1 : 1);
    return;
  }
  if (e.key === 'ArrowDown') { e.preventDefault(); navigateInfileMatch(1); }
  if (e.key === 'ArrowUp') { e.preventDefault(); navigateInfileMatch(-1); }
}

let _searchDebounce = null;
let _lastSearchQuery = '';

function handleSearch(query) {
  _lastSearchQuery = query;
  const results = document.getElementById('searchResults');
  if (query.length < 2) { results.classList.remove('active'); results.innerHTML = ''; return; }

  clearTimeout(_searchDebounce);
  _searchDebounce = setTimeout(() => _doSearch(query), 200);
}

function handleSearchKeydown(e) {
  if (e.key === 'Escape') {
    closeSearchDropdown();
    e.target.blur();
  }
}

function closeSearchDropdown() {
  const results = document.getElementById('searchResults');
  results.classList.remove('active');
}

async function _doSearch(query) {
  const results = document.getElementById('searchResults');
  if (query.length < 2) { results.classList.remove('active'); results.innerHTML = ''; return; }

  // Load all files that haven't been fetched yet
  const unloaded = FILES.map((f, i) => fileContents[i] === undefined ? i : null).filter(i => i !== null);
  if (unloaded.length > 0) {
    results.innerHTML = '<div style="padding:7px 14px;font-size:12px;color:var(--text-muted)">Loading files...</div>';
    results.classList.add('active');
    await Promise.all(unloaded.map(i => loadFile(i)));
  }

  const q = query.toLowerCase();
  let allItems = [];
  FILES.forEach((f, idx) => {
    const text = stripFrontmatter(fileContents[idx] || '');
    text.split('\n').forEach((line, lineNum) => {
      if (line.toLowerCase().includes(q)) {
        const clean = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        if (!clean) return;
        allItems.push({ idx, file: f, line: clean, lineNum });
      }
    });
  });

  if (allItems.length === 0) {
    results.innerHTML = '<div style="padding:7px 14px;font-size:12px;color:var(--text-muted)">No results</div>';
    results.classList.add('active');
    return;
  }

  const items = allItems.slice(0, 15);
  const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  const itemsHtml = items.map(it => {
    const h = it.line.substring(0, 100).replace(re, '<mark>$1</mark>');
    return `<div class="search-result-item" onclick="showFile(${it.idx});searchScroll(${it.lineNum})">
      <div class="file-label">${it.file.title}</div>
      <div class="match-text">${h}${it.line.length > 100 ? '...' : ''}</div>
    </div>`;
  }).join('');

  const footerHtml = `<div class="search-dropdown-footer">
    <button class="search-show-all-btn" onclick="showSearchView('${query.replace(/'/g, "\\'")}')">Show all ${allItems.length} result${allItems.length !== 1 ? 's' : ''}</button>
  </div>`;

  results.innerHTML = itemsHtml + footerHtml;
  results.classList.add('active');
}

function searchScroll(lineNum) {
  closeSearchDropdown();
  document.getElementById('search').value = '';
  const content = document.getElementById('content');
  const total = (fileContents[activeFileIdx] || '').split('\n').length;
  const pct = lineNum / total;
  document.body.scrollTo({ top: content.offsetTop + content.scrollHeight * pct - 100, behavior: 'smooth' });
}

function showSearchView(query) {
  closeSearchDropdown();
  document.getElementById('search').value = query;
  saveCurrentTabScroll();
  activeFileIdx = null;
  window.location.hash = '';
  document.body.classList.add('no-active-file');
  renderTabBar();

  document.getElementById('breadcrumbBar').style.display = 'none';
  document.getElementById('content').style.display = 'none';
  document.getElementById('editorWrapper').style.display = 'none';
  document.getElementById('loading').style.display = 'none';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Remove existing dashboard
  const existingDash = document.getElementById('dashboard');
  if (existingDash) existingDash.style.display = 'none';

  // Build search results view
  let view = document.getElementById('searchViewPanel');
  if (!view) {
    view = document.createElement('div');
    view.id = 'searchViewPanel';
    view.className = 'search-view';
    document.querySelector('.content-wrapper').appendChild(view);
  }
  view.style.display = 'block';

  const q = query.toLowerCase();
  let allItems = [];
  FILES.forEach((f, idx) => {
    const text = stripFrontmatter(fileContents[idx] || '');
    text.split('\n').forEach((line, lineNum) => {
      if (line.toLowerCase().includes(q)) {
        const clean = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        if (!clean) return;
        allItems.push({ idx, file: f, line: clean, lineNum });
      }
    });
  });

  const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  const itemsHtml = allItems.length === 0
    ? '<div style="padding:20px 0;color:var(--text-muted);font-size:13px">No results found.</div>'
    : allItems.map(it => {
        const h = it.line.substring(0, 120).replace(re, '<mark>$1</mark>');
        return `<div class="search-view-item" onclick="showFile(${it.idx});searchScroll(${it.lineNum})">
          <div class="file-label">${it.file.title}</div>
          <div class="match-text">${h}${it.line.length > 120 ? '...' : ''}</div>
        </div>`;
      }).join('');

  view.innerHTML = `
    <div class="search-view-header">
      <div class="search-view-title">Search results for <em style="color:var(--accent)">${query.replace(/</g,'&lt;')}</em></div>
      <span class="search-view-count">${allItems.length} match${allItems.length !== 1 ? 'es' : ''}</span>
      <button class="search-view-close" onclick="closeSearchView()">&#x2715; Close</button>
    </div>
    <div class="search-view-list">${itemsHtml}</div>
  `;
}

function closeSearchView() {
  const view = document.getElementById('searchViewPanel');
  if (view) view.style.display = 'none';
  document.getElementById('search').value = '';
  showDashboard();
}

