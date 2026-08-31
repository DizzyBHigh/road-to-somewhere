function siteRootPath() {
  const stylesheet = document.querySelector('link[href*="/assets/site.css"]');
  if (!stylesheet) return '';
  return new URL(stylesheet.href, window.location.href).pathname.replace(/\/assets\/site\.css$/, '');
}

function findMatchingToken(source, start) {
  let depth = 1;
  for (let i = start; i < source.length - 1; i++) {
    if (source[i] === '[' && source[i + 1] === '[') { depth++; i++; }
    else if (source[i] === ']' && source[i + 1] === ']') {
      depth--;
      if (depth === 0) return i;
      i++;
    }
  }
  return -1;
}

function makeCopyButton(label, kind) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rts-copy-token';
  button.dataset.copyKind = kind;
  appendFormattedText(button, label);
  button.appendChild(document.createTextNode(' ⧉'));
  return button;
}

function appendFormattedText(parent, text) {
  const source = String(text ?? '');
  let i = 0;
  while (i < source.length) {
    if (source[i] === '[' && source[i + 1] === '[') {
      const end = findMatchingToken(source, i + 2);
      if (end !== -1) {
        const token = source.slice(i + 2, end);
        const colon = token.indexOf(':');
        if (colon !== -1) {
          const tag = token.slice(0, colon).toLowerCase();
          const value = token.slice(colon + 1);
          if (['blue', 'yellow', 'muted'].includes(tag)) {
            const span = document.createElement('span');
            span.className = `rts-text-${tag}`;
            appendFormattedText(span, value);
            parent.appendChild(span);
          } else if (tag === 'code' || tag === 'overlay') {
            parent.appendChild(makeCopyButton(value, tag));
          } else if (tag === 'overlayzip') {
            const link = document.createElement('a');
            link.className = 'rts-content-link';
            link.href = document.querySelector('[data-overlay-zip-url]')?.dataset.overlayZipUrl || '#';
            appendFormattedText(link, value);
            parent.appendChild(link);
          } else if (tag === 'dll') {
            const link = document.createElement('a');
            link.className = 'rts-content-link';
            link.href = `${siteRootPath()}/dll/`;
            appendFormattedText(link, value);
            parent.appendChild(link);
          } else if (tag === 'link') {
            const separator = value.indexOf('|');
            const url = separator >= 0 ? value.slice(0, separator).trim() : '';
            const label = separator >= 0 ? value.slice(separator + 1) : value;
            const link = document.createElement('a');
            link.className = 'rts-content-link';
            link.href = /^(https?:\/\/|\/)/i.test(url) ? url : '#';
            appendFormattedText(link, label);
            parent.appendChild(link);
          } else if (/^[a-z0-9-]+$/i.test(tag)) {
            const link = document.createElement('a');
            link.className = 'rts-content-link';
            link.href = `${siteRootPath()}/extensions/${tag}/`;
            appendFormattedText(link, value);
            parent.appendChild(link);
          } else {
            parent.appendChild(document.createTextNode(source.slice(i, end + 2)));
          }
          i = end + 2;
          continue;
        }
      }
    }
    if (source[i] === '*' && source[i + 1] === '*') {
      const end = source.indexOf('**', i + 2);
      if (end !== -1) {
        const strong = document.createElement('strong');
        appendFormattedText(strong, source.slice(i + 2, end));
        parent.appendChild(strong);
        i = end + 2;
        continue;
      }
    }
    if (source[i] === '\n') { parent.appendChild(document.createElement('br')); i++; continue; }
    if (source[i] === '\\' && source[i + 1] === 'n') { parent.appendChild(document.createElement('br')); i += 2; continue; }
    parent.appendChild(document.createTextNode(source[i]));
    i++;
  }
}

function formatRtsContent() {
  document.querySelectorAll('.rts-format').forEach(element => {
    if (element.dataset.rtsFormatted === 'true') return;
    const source = element.textContent || '';
    element.textContent = '';
    appendFormattedText(element, source);
    element.dataset.rtsFormatted = 'true';
  });
}

document.addEventListener('DOMContentLoaded', formatRtsContent);