const LOGO_URL =
  'https://static.wixstatic.com/media/453317_cb9f63ff26714a80828d532ffc091160~mv2.png';

export interface NotificationEmailContent {
  subject: string;
  message: string;
  ctaUrl?: string | null;
  ctaLabel?: string;
}

export const DEFAULT_CTA_LABEL = 'Peržiūrėti';

export function renderNotificationEmailHtml({
  subject,
  message,
  ctaUrl,
  ctaLabel = DEFAULT_CTA_LABEL,
}: NotificationEmailContent): string {
  const paragraphHtml = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #1f2933;">${escapeHtml(line)}</p>`) // inline CSS for readability
    .join('');

  const ctaHtml = ctaUrl
    ? `<div style="margin-top: 32px;"><a href="${escapeAttribute(ctaUrl)}" style="display: inline-block; background-color: #fbbf24; color: #1f2933; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">${escapeHtml(ctaLabel)}</a></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="lt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', sans-serif; background-color: #f8fafc; color: #1f2933;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);">
            <tr>
              <td align="center" style="padding-bottom: 24px;">
                <img src="${LOGO_URL}" alt="Bitininkas" style="max-width: 180px; height: auto;" />
              </td>
            </tr>
            <tr>
              <td>
                <h1 style="font-size: 24px; line-height: 32px; margin: 0 0 24px 0; color: #111827;">${escapeHtml(
                  subject,
                )}</h1>
                ${paragraphHtml}
                ${ctaHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderNotificationEmailText({
  message,
  ctaUrl,
  ctaLabel = DEFAULT_CTA_LABEL,
}: Pick<NotificationEmailContent, 'message' | 'ctaUrl' | 'ctaLabel'>): string {
  const lines = [message.trim()].filter((line) => line.length > 0);

  if (ctaUrl) {
    lines.push(`${ctaLabel}: ${ctaUrl}`);
  }

  return lines.join('\n\n');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string) {
  return value.replace(/"/g, '%22');
}
