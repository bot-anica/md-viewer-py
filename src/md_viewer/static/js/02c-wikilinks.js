// ---- Obsidian-style wiki-links ----
// Parses [[filename]] and [[filename|display text]] into clickable links

marked.use({
  extensions: [{
    name: 'wikilink',
    level: 'inline',
    start(src) {
      return src.indexOf('[[');
    },
    tokenizer(src) {
      const match = src.match(/^\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/);
      if (match) {
        return {
          type: 'wikilink',
          raw: match[0],
          target: match[1].trim(),
          displayText: (match[2] || match[1]).trim()
        };
      }
    },
    renderer(token) {
      const escaped = token.target.replace(/"/g, '&quot;');
      const display = token.displayText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<a class="wiki-link" data-wiki-target="' + escaped + '">' + display + '</a>';
    }
  }]
});

