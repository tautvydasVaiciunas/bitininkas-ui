import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span'];

export function sanitizeNewsBody(value: string) {
  return DOMPurify.sanitize(value || '', {
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
