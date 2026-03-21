async function loadFile(idx) {
  if (fileContents[idx] !== undefined) return fileContents[idx];
  const f = FILES[idx];
  try {
    const resp = await fetch('/files/' + f.path.split('/').map(encodeURIComponent).join('/'));
    if (!resp.ok) throw new Error(resp.status);
    fileContents[idx] = await resp.text();
  } catch {
    fileContents[idx] = `# Error loading ${f.path}`;
  }
  return fileContents[idx];
}

function buildTree(files) {
  // Build a nested tree: { _files: [...], subfolder: { _files: [...], ... } }
  const root = { _files: [] };
  files.forEach((f, i) => {
    f._idx = i;
    const parts = f.folder ? f.folder.split('/') : [];
    let node = root;
    for (const part of parts) {
      if (!node[part]) node[part] = { _files: [] };
      node = node[part];
    }
    node._files.push(f);
  });
  return root;
}

function countFiles(node) {
  let n = node._files ? node._files.length : 0;
  for (const key of Object.keys(node)) {
    if (key === '_files') continue;
    n += countFiles(node[key]);
  }
  return n;
}

let hasFolders = false;
let activeFileFilter = '';

function handleFileFilter(value) {
  activeFileFilter = value.trim().toLowerCase();
  document.getElementById('filterClear').style.display = activeFileFilter ? 'inline-block' : 'none';
  applyFileFilter();
}

function clearFileFilter() {
  activeFileFilter = '';
  document.getElementById('fileFilterInput').value = '';
  document.getElementById('filterClear').style.display = 'none';
  applyFileFilter();
}

function applyFileFilter() {
  const query = activeFileFilter;
  // Show/hide nav items based on filename match
  document.querySelectorAll('#navItems .nav-item').forEach(el => {
    const title = (el.querySelector('.nav-title')?.textContent || '').toLowerCase();
    const meta = (el.querySelector('.nav-meta')?.textContent || '').toLowerCase();
    el.style.display = (!query || title.includes(query) || meta.includes(query)) ? '' : 'none';
  });
  // Show/hide folders based on whether they have visible items; expand matching ones
  Array.from(document.querySelectorAll('#navItems .tree-node')).reverse().forEach(node => {
    const hasVisible = Array.from(node.querySelectorAll('.nav-item')).some(el => el.style.display !== 'none');
    node.style.display = hasVisible ? '' : 'none';
    if (query && hasVisible) {
      const header = node.querySelector(':scope > .tree-folder');
      const children = node.querySelector(':scope > .tree-children');
      if (header) header.classList.remove('collapsed');
      if (children) children.classList.remove('collapsed');
    }
  });
}

function renderNav() {
  const container = document.getElementById('navItems');
  container.innerHTML = '';
  const tree = buildTree(FILES);

  // Check if there are any folders
  hasFolders = Object.keys(tree).filter(k => k !== '_files').length > 0;
  document.getElementById('sidebarToolbar').style.display = hasFolders ? 'flex' : 'none';
  document.getElementById('fileFilter').style.display = FILES.length > 0 ? 'flex' : 'none';

  if (!hasFolders) {
    const label = document.createElement('div');
    label.className = 'sidebar-section-label';
    label.textContent = 'Files';
    container.appendChild(label);
  }

  renderTreeNode(container, tree, 0, true);
  applyFileFilter();
}

function collapseAll() {
  document.querySelectorAll('#navItems .tree-folder').forEach(h => h.classList.add('collapsed'));
  document.querySelectorAll('#navItems .tree-children').forEach(c => c.classList.add('collapsed'));
  // Re-expand path to active file
  if (activeFileIdx !== null) {
    const navEl = document.getElementById('nav-' + activeFileIdx);
    if (navEl) {
      let el = navEl.parentElement;
      while (el && el.id !== 'navItems') {
        if (el.classList.contains('tree-children') && el.classList.contains('collapsed')) {
          el.classList.remove('collapsed');
          const header = el.previousElementSibling;
          if (header && header.classList.contains('tree-folder')) header.classList.remove('collapsed');
        }
        el = el.parentElement;
      }
    }
  }
}

function renderTreeNode(parent, node, depth, isRoot) {
  const folderKeys = Object.keys(node).filter(k => k !== '_files').sort();
  const indent = 12 + depth * 16;

  // Render subfolders first
  folderKeys.forEach(name => {
    const child = node[name];
    const count = countFiles(child);
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node';

    const header = document.createElement('div');
    header.className = 'tree-folder collapsed';
    header.style.paddingLeft = indent + 'px';
    header.innerHTML = `<span class="chevron"><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,2 10,2 5,8" fill="currentColor"/></svg></span><span class="folder-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg></span><span class="folder-name">${name}</span><span class="folder-count">${count}</span>`;

    const children = document.createElement('div');
    children.className = 'tree-children collapsed';

    header.onclick = () => {
      header.classList.toggle('collapsed');
      children.classList.toggle('collapsed');
    };

    wrapper.appendChild(header);
    renderTreeNode(children, child, depth + 1, false);
    wrapper.appendChild(children);
    parent.appendChild(wrapper);
  });

  // Render files
  if (node._files) {
    node._files.forEach(f => {
      parent.appendChild(createNavItem(f, indent));
    });
  }
}

function createNavItem(f, indent) {
  const item = document.createElement('div');
  item.className = 'nav-item';
  item.id = 'nav-' + f._idx;
  item.style.paddingLeft = (indent + 8) + 'px';
  item.onclick = (e) => { e.stopPropagation(); showFile(f._idx); };

  item.innerHTML = `
    ${buildNavIconHtml(f._idx)}
    <div class="nav-details">
      <div class="nav-title">${f.title}</div>
      <div class="nav-meta">${f.name} &middot; ${f.lines} lines</div>
    </div>
  `;
  return item;
}

