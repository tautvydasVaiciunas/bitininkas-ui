import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span'];

export function sanitizeNewsBody(value: string) {
  const input = (value ?? '').replace(/\r\n/g, '\n').trim();
  if (!input) {
    return '';
  }

  const containsHtml = /<[^>]+>/.test(input);
  const html = containsHtml
    ? input
    : input
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('');

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  });
}

export function extractTextFromHtml(value: string) {
  if (typeof document === 'undefined') {
    return value.replace(/<[^>]+>/g, '');
  }
  const container = document.createElement('div');
  container.innerHTML = value || '';
  return container.textContent ?? '';
}

export function buildSnippet(value: string, maxLength = 220) {
  const normalized = extractTextFromHtml(value)
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}…`;
}
