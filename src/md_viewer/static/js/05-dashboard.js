let _dashboardFolder = null; // null = root, string = subfolder path

function showDashboard(folder) {
  saveCurrentTabScroll();
  _dashboardFolder = folder || null;
  activeFileIdx = null;
  window.location.hash = '';
  document.body.classList.add('no-active-file');
  renderTabBar();

  // Hide search view
  const svp = document.getElementById('searchViewPanel');
  if (svp) svp.style.display = 'none';

  // Hide file view elements
  document.getElementById('breadcrumbBar').style.display = 'none';
  document.getElementById('content').style.display = 'none';
  document.getElementById('editorWrapper').style.display = 'none';
  const tocContainer = document.getElementById('tocContainer');
  tocContainer.innerHTML = '';
  const useRight = _tocPosition === 'right' && window.innerWidth > 900;
  if (useRight) {
    tocContainer.innerHTML = `
      <div class="toc-toolbar">
        <div class="sidebar-section-label toc-toggle">On this page</div>
      </div>
      <div class="toc-empty-msg">Open a file to see its table of contents</div>`;
  }
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const loading = document.getElementById('loading');
  loading.style.display = 'none';

  // Build dashboard grid
  let dashboard = document.getElementById('dashboard');
  if (!dashboard) {
    dashboard = document.createElement('div');
    dashboard.id = 'dashboard';
    dashboard.className = 'dashboard';
    document.querySelector('.content-wrapper').appendChild(dashboard);
  }
  dashboard.style.display = 'block';
  dashboard.innerHTML = '';

  // Build folder/file structure for current level
  const tree = buildTree(FILES);
  let node = tree;
  let breadcrumbParts = [];

  if (folder) {
    const parts = folder.split('/');
    for (const part of parts) {
      if (node[part]) {
        node = node[part];
        breadcrumbParts.push(part);
      }
    }
  }

  // Breadcrumb navigation for dashboard
  if (breadcrumbParts.length > 0) {
    const bc = document.createElement('div');
    bc.className = 'dashboard-breadcrumb';
    let html = '<a class="dashboard-bc-link" onclick="showDashboard()">Home</a>';
    for (let i = 0; i < breadcrumbParts.length; i++) {
      const path = breadcrumbParts.slice(0, i + 1).join('/');
      html += '<span class="sep">/</span>';
      if (i < breadcrumbParts.length - 1) {
        html += `<a class="dashboard-bc-link" onclick="showDashboard('${path}')">${breadcrumbParts[i]}</a>`;
      } else {
        html += `<span>${breadcrumbParts[i]}</span>`;
      }
    }
    bc.innerHTML = html;
    dashboard.appendChild(bc);
  }

  const grid = document.createElement('div');
  grid.className = 'dashboard-grid';

  // Render folder cards
  const folderKeys = Object.keys(node).filter(k => k !== '_files').sort();
  folderKeys.forEach(name => {
    const count = countFiles(node[name]);
    const folderPath = folder ? folder + '/' + name : name;
    const card = document.createElement('div');
    card.className = 'dashboard-card dashboard-folder';
    card.onclick = () => showDashboard(folderPath);
    card.innerHTML = `
      <div class="dashboard-card-icon folder-icon-large">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
      </div>
      <div class="dashboard-card-name">${name}</div>
      <div class="dashboard-card-meta">${count} file${count !== 1 ? 's' : ''}</div>
    `;
    grid.appendChild(card);
  });

  // Render file cards
  if (node._files) {
    node._files.forEach(f => {
      const card = document.createElement('div');
      card.className = 'dashboard-card dashboard-file';
      card.onclick = () => showFile(f._idx);
      card.innerHTML = `
        <div class="dashboard-card-icon">
          ${buildFileIconSvg(f._idx)}
        </div>
        <div class="dashboard-card-name">${f.title}</div>
        <div class="dashboard-card-meta">${f.lines} lines</div>
      `;
      grid.appendChild(card);
    });
  }

  dashboard.appendChild(grid);
  document.body.scrollTo({ top: 0 });
}

