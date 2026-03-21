// ---- Editor functions ----
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.includes('Mac');

function toggleEditMode() {
  if (activeFileIdx === null) return;

  if (!isEditMode) {
    enterEditMode();
  } else {
    exitEditMode();
  }
}

function enterEditMode() {
  if (activeFileIdx === null) return;

  const content = document.getElementById('content');
  const editorWrapper = document.getElementById('editorWrapper');
  const editBtn = document.getElementById('editBtn');

  // Get current file content
  const f = FILES[activeFileIdx];
  originalContent = fileContents[activeFileIdx] || '';

  // Hide content, show editor
  content.style.display = 'none';
  editorWrapper.style.display = 'block';
  editBtn.classList.add('active');
  editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg> View';

  // Initialize EasyMDE
  const textarea = document.getElementById('editor');
  textarea.value = originalContent;

  easyMDE = new EasyMDE({
    element: textarea,
    initialValue: originalContent,
    autofocus: true,
    spellChecker: false,
    status: ['autosave', 'lines', 'words'],
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'code', 'link', 'image', '|',
      'unordered-list', 'ordered-list', '|',
      'preview', '|',
      {
        name: 'save',
        action: saveFile,
        className: 'fa fa-floppy-o',
        title: 'Save (' + (isMac ? 'Cmd' : 'Ctrl') + '+S)',
      }
    ],
    previewRender: (plainText) => {
      return marked.parse(stripFrontmatter(plainText), { gfm: true, breaks: false });
    }
  });

  // Bind Ctrl+S to save
  easyMDE.codemirror.on('keydown', (cm, event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      saveFile();
    }
  });

  // Update status on change
  easyMDE.codemirror.on('change', () => {
    updateEditorStatus();
  });

  isEditMode = true;
  updateEditorStatus();
  updateSaveBtn();
}

function exitEditMode() {
  const content = document.getElementById('content');
  const editorWrapper = document.getElementById('editorWrapper');
  const editBtn = document.getElementById('editBtn');

  // Check for unsaved changes
  const currentContent = easyMDE ? easyMDE.value() : '';
  if (currentContent !== originalContent) {
    if (!confirm('You have unsaved changes. Discard them?')) {
      return;
    }
  }

  // Clean up editor
  if (easyMDE) {
    easyMDE.toTextArea();
    easyMDE = null;
  }

  // Show content, hide editor
  editorWrapper.style.display = 'none';
  content.style.display = 'block';
  editBtn.classList.remove('active');
  editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> Edit';

  isEditMode = false;

  // Refresh content
  showFile(activeFileIdx);
}

async function saveFile() {
  if (!easyMDE || activeFileIdx === null) return;

  const f = FILES[activeFileIdx];
  const content = easyMDE.value();
  const statusEl = document.getElementById('editorStatus');

  // Don't save if nothing changed
  if (content === originalContent) {
    statusEl.innerHTML = '<span style="color:var(--text-muted)">No changes to save</span>';
    setTimeout(() => { statusEl.innerHTML = ''; }, 1500);
    return;
  }

  statusEl.innerHTML = '<span style="color:var(--accent)">⏳ Saving...</span>';

  try {
    const resp = await fetch('/files/' + f.path.split('/').map(encodeURIComponent).join('/'), {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: content
    });

    if (resp.ok) {
      originalContent = content;
      fileContents[activeFileIdx] = content;
      exitEditMode();
      showToast('File saved successfully');
    } else {
      const err = await resp.text();
      statusEl.innerHTML = `<span class="error">✗ Save failed: ${resp.status}</span>`;
    }
  } catch (e) {
    statusEl.innerHTML = `<span class="error">✗ Network error: ${e.message || 'Unknown error'}</span>`;
  }
}

function updateEditorStatus() {
  if (!easyMDE) return;
  const currentContent = easyMDE.value();
  const statusEl = document.getElementById('editorStatus');
  const isDirty = currentContent !== originalContent;

  const modKey = isMac ? 'Cmd' : 'Ctrl';
  const msg = isDirty ? '<span class="dirty">● Modified (' + modKey + '+S to save)</span>' : '';
  if (statusEl) statusEl.innerHTML = msg;
  updateSaveBtn();
}

function updateSaveBtn() {
  if (!easyMDE) return;
  const isDirty = easyMDE.value() !== originalContent;
  const btn = document.getElementById('editorSaveBtn');
  if (btn) btn.disabled = !isDirty;
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML = (type === 'success'
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>')
    + '<span>' + message + '</span>';
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 5000);
}

