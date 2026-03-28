// ---- Obsidian-style callout blocks ----
// Renders > [!TYPE] blockquotes as styled callout boxes
// Supports foldable callouts with +/- suffix and custom titles

const CALLOUT_TYPES = {
  note:     { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>', color: 'var(--accent)' },
  abstract: { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="8" y2="8"/><line x1="21" x2="14" y1="12" y2="12"/><line x1="21" x2="14" y1="16" y2="16"/><rect x="3" y="4" width="7" height="16" rx="1"/></svg>', color: 'var(--cyan)' },
  summary:  { alias: 'abstract' },
  tldr:     { alias: 'abstract' },
  info:     { alias: 'note' },
  todo:     { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>', color: 'var(--accent)' },
  tip:      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>', color: 'var(--cyan)' },
  hint:     { alias: 'tip' },
  important:{ icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 3-13 13"/><path d="M22 6.5a4.95 4.95 0 0 0-7 0l-7 7a4.95 4.95 0 0 0 0 7 4.95 4.95 0 0 0 7 0l7-7a4.95 4.95 0 0 0 0-7Z"/></svg>', color: 'var(--red)' },
  success:  { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>', color: 'var(--green)' },
  check:    { alias: 'success' },
  done:     { alias: 'success' },
  question: { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>', color: 'var(--amber)' },
  help:     { alias: 'question' },
  faq:      { alias: 'question' },
  warning:  { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>', color: '#f97316' },
  caution:  { alias: 'warning' },
  attention:{ alias: 'warning' },
  failure:  { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>', color: 'var(--red)' },
  fail:     { alias: 'failure' },
  missing:  { alias: 'failure' },
  danger:   { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>', color: 'var(--red)' },
  error:    { alias: 'danger' },
  bug:      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>', color: 'var(--red)' },
  example:  { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>', color: '#a78bfa' },
  quote:    { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3"/></svg>', color: 'var(--text-muted)' },
  cite:     { alias: 'quote' },
};

function _resolveCallout(type) {
  let entry = CALLOUT_TYPES[type];
  while (entry && entry.alias) entry = CALLOUT_TYPES[entry.alias];
  return entry || CALLOUT_TYPES.note;
}

const _CALLOUT_OPEN = /^<p>\[!(\w+)\]([+-])?/i;

marked.use({
  renderer: {
    blockquote({ tokens }) {
      const body = this.parser.parse(tokens);
      const m = body.match(_CALLOUT_OPEN);
      if (!m) return false; // fall through to default blockquote

      const typeName = m[1].toLowerCase();
      const fold = m[2] || '';     // '+', '-', or ''
      const callout = _resolveCallout(typeName);

      // Parse rest of first <p>: extract custom title (same line) and body content (after newline)
      let rest = body.slice(m[0].length);
      let customTitle = '';
      let innerBody = '';
      const nlIdx = rest.indexOf('\n');
      const pClose = rest.indexOf('</p>');

      if (pClose < 0) {
        // Malformed — treat everything as title
        customTitle = rest.replace(/<[^>]*>/g, '').trim();
      } else if (nlIdx >= 0 && nlIdx < pClose) {
        // Title is on the [!TYPE] line, body content continues after newline
        customTitle = rest.slice(0, nlIdx).replace(/<[^>]*>/g, '').trim();
        const firstPRest = rest.slice(nlIdx + 1, pClose).trim();
        const afterFirstP = rest.slice(pClose + 4).trim();
        innerBody = (firstPRest ? '<p>' + firstPRest + '</p>' : '') + (afterFirstP ? '\n' + afterFirstP : '');
      } else {
        // No newline in first <p> — everything before </p> is the title
        customTitle = rest.slice(0, pClose).replace(/<[^>]*>/g, '').trim();
        innerBody = rest.slice(pClose + 4).trim();
      }

      const title = customTitle || typeName.charAt(0).toUpperCase() + typeName.slice(1);
      innerBody = innerBody.trim();

      const chevronSvg = '<svg class="callout-fold-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

      const titleHtml = '<div class="callout-title">'
        + '<span class="callout-icon">' + callout.icon + '</span>'
        + '<span class="callout-title-text">' + title + '</span>'
        + (fold ? chevronSvg : '')
        + '</div>';

      if (fold) {
        const open = fold === '+' ? ' open' : '';
        return '<div class="callout callout-' + typeName + '" style="--callout-color:' + callout.color + '">'
          + '<details' + open + '>'
          + '<summary>' + titleHtml + '</summary>'
          + '<div class="callout-content">' + innerBody + '</div>'
          + '</details>'
          + '</div>';
      }

      return '<div class="callout callout-' + typeName + '" style="--callout-color:' + callout.color + '">'
        + titleHtml
        + (innerBody ? '<div class="callout-content">' + innerBody + '</div>' : '')
        + '</div>';
    }
  }
});

