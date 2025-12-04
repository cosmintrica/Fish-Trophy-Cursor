/**
 * BBCode Preview Parser - Parser simplu pentru preview în Advanced Editor
 * Parsează tag-urile de bază: [b], [i], [u], [s], [h1-h3], [list], [url], [img], [code]
 */

/**
 * Escape HTML pentru prevenirea XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Parsează BBCode simplu pentru preview
 */
export function parseBBCodePreview(content: string): string {
  let html = escapeHtml(content);

  // Headings - trebuie înainte de alte tag-uri pentru a nu fi afectate
  html = html.replace(/\[h1\](.*?)\[\/h1\]/gi, '<h1 style="font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem 0; line-height: 1.2;">$1</h1>');
  html = html.replace(/\[h2\](.*?)\[\/h2\]/gi, '<h2 style="font-size: 1.25rem; font-weight: 600; margin: 0.875rem 0 0.5rem 0; line-height: 1.3;">$1</h2>');
  html = html.replace(/\[h3\](.*?)\[\/h3\]/gi, '<h3 style="font-size: 1.125rem; font-weight: 600; margin: 0.75rem 0 0.5rem 0; line-height: 1.4;">$1</h3>');

  // Lists - trebuie procesate înainte de inline tags
  // Unordered lists
  html = html.replace(/\[list\](.*?)\[\/list\]/gis, (match, content) => {
    const items = content.split(/\[\*\]/).filter((item: string) => item.trim());
    const listItems = items.map((item: string) => `<li style="margin: 0.25rem 0;">${item.trim()}</li>`).join('');
    return `<ul style="margin: 0.5rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems}</ul>`;
  });

  // Ordered lists
  html = html.replace(/\[list=1\](.*?)\[\/list\]/gis, (match, content) => {
    const items = content.split(/\[\*\]/).filter((item: string) => item.trim());
    const listItems = items.map((item: string) => `<li style="margin: 0.25rem 0;">${item.trim()}</li>`).join('');
    return `<ol style="margin: 0.5rem 0; padding-left: 1.5rem; list-style-type: decimal;">${listItems}</ol>`;
  });

  // Code blocks - trebuie înainte de inline tags
  html = html.replace(/\[code\](.*?)\[\/code\]/gis, (match, content) => {
    return `<pre style="background: rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 0.375rem; padding: 0.75rem; margin: 0.5rem 0; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 0.875rem; line-height: 1.5;"><code>${escapeHtml(content)}</code></pre>`;
  });

  // Links
  html = html.replace(/\[url=([^\]]+)\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">$2</a>');
  html = html.replace(/\[url\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">$1</a>');

  // Images
  html = html.replace(/\[img\](.*?)\[\/img\]/gi, (match, url) => {
    return `<img src="${escapeHtml(url.trim())}" alt="Imagine" style="max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.5rem 0;" onerror="this.style.display='none'; this.nextElementSibling?.style.display='block';" /><div style="display: none; color: #dc2626; font-size: 0.875rem; padding: 0.5rem; background: rgba(220, 38, 38, 0.1); border-radius: 0.375rem; margin: 0.5rem 0;">Eroare: Imaginea nu poate fi încărcată</div>`;
  });

  // Video - YouTube/Vimeo
  html = html.replace(/\[video\](https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+))\[\/video\]/gi, (match, fullUrl, videoId) => {
    return `<div style="position: relative; padding-bottom: 56.25%; height: 0; margin: 0.75rem 0;"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 0.5rem;"></iframe></div>`;
  });
  html = html.replace(/\[video\](https?:\/\/vimeo\.com\/(\d+))\[\/video\]/gi, (match, fullUrl, videoId) => {
    return `<div style="position: relative; padding-bottom: 56.25%; height: 0; margin: 0.75rem 0;"><iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 0.5rem;"></iframe></div>`;
  });

  // Inline formatting - trebuie după toate celelalte
  html = html.replace(/\[b\](.*?)\[\/b\]/gi, '<strong style="font-weight: 700;">$1</strong>');
  html = html.replace(/\[i\](.*?)\[\/i\]/gi, '<em style="font-style: italic;">$1</em>');
  html = html.replace(/\[u\](.*?)\[\/u\]/gi, '<u style="text-decoration: underline;">$1</u>');
  html = html.replace(/\[s\](.*?)\[\/s\]/gi, '<s style="text-decoration: line-through;">$1</s>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

