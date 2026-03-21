function makeSectionsCollapsible(container) {
  wrapLevel(container, 2);
}

function wrapLevel(container, level) {
  const tag = 'H' + level;
  const children = Array.from(container.children);
  let i = 0;

  while (i < children.length) {
    const el = children[i];
    if (el.tagName !== tag) { i++; continue; }

    const body = document.createElement('div');
    body.className = 'section-body';

    // Collect siblings until next heading of same or higher level
    let next = el.nextElementSibling;
    while (next && !(next.tagName && next.tagName.match(/^H[1-9]$/) && parseInt(next.tagName[1]) <= level)) {
      const move = next;
      next = next.nextElementSibling;
      body.appendChild(move);
    }

    if (body.children.length > 0) {
      el.after(body);
      el.onclick = (e) => {
        if (e.target.closest && e.target.closest('a')) return;
        if (e.target.tagName === 'A') return;
        el.classList.toggle('collapsed');
        body.classList.toggle('collapsed');
      };
      // Recurse into this section-body for deeper headings
      if (level < 4) wrapLevel(body, level + 1);

      // Re-scan since DOM changed
      children.length = 0;
      children.push(...Array.from(container.children));
      i = children.indexOf(body) + 1;
    } else {
      // No content to wrap; advance past this heading to avoid infinite loop
      i++;
    }
  }
}

function collapseSections(collapse) {
  const content = document.getElementById('content');
  content.querySelectorAll('h2, h3, h4').forEach(h => {
    const body = h.nextElementSibling;
    if (!body || !body.classList.contains('section-body')) return;
    if (collapse) {
      h.classList.add('collapsed');
      body.classList.add('collapsed');
    } else {
      h.classList.remove('collapsed');
      body.classList.remove('collapsed');
    }
  });
}

