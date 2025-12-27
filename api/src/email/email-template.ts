const LOGO_CID = 'busmedaus-logo';
const FACEBOOK_CID = 'busmedaus-facebook';
const INSTAGRAM_CID = 'busmedaus-instagram';

export interface NotificationEmailContent {
  subject: string;
  message: string;
  ctaUrl?: string | null;
}

export const DEFAULT_CTA_LABEL = 'Peržiūrėti';

export interface EmailLayoutOptions {
  subject: string;
  mainHtml: string;
  primaryButtonLabel?: string | null;
  primaryButtonUrl?: string | null;
}

export function renderEmailLayout({
  subject,
  mainHtml,
  primaryButtonLabel,
  primaryButtonUrl,
}: EmailLayoutOptions): string {
  const buttonHtml =
    primaryButtonLabel && primaryButtonUrl
      ? `<div style="padding: 16px 0 12px 0; text-align: center;">
          <a href="${escapeAttribute(primaryButtonUrl)}" style="background-color: #0acb8b; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 9999px; font-weight: 600; font-size: 15px; display: inline-block;">${escapeHtml(
            primaryButtonLabel,
          )}</a>
        </div>`
      : '';

  return `<!DOCTYPE html>
<html lang="lt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', sans-serif; background-color: #f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; min-height: 100vh;">
      <tr>
        <td align="center" style="padding: 24px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="background-color: #fed773; padding: 14px 24px; text-align: left;">
                <div style="display:block;">
                  <img src="cid:${LOGO_CID}" alt="Bus medaus" style="display: block; width: 140px; height: auto; border: 0; outline: none; text-decoration: none;" />
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #ffffff; padding: 32px 48px 40px 48px; color: #1f2933;">
                ${mainHtml}
                ${buttonHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color: #fed773; padding: 24px 48px 32px 48px; color: #111827;">
                <p style="margin: 0 0 4px 0; font-weight: 600;">Bitininku tapti paprasta su „Bus medaus“</p>
                <p style="margin: 0 0 4px 0;">© „Bus medaus“ | busmedaus.lt</p>
                <p style="margin: 0 0 8px 0;">+370 610 69 676</p>
                <p style="margin: 0; font-size: 14px;">
                  Sekite mus:
                  <a href="https://www.facebook.com/busmedaus.lt" style="margin-left: 8px; color: #111827; text-decoration: none; display: inline-flex; align-items: center;">
                    <img src="cid:${FACEBOOK_CID}" alt="Facebook" width="16" height="16" style="display: inline-block; margin-right: 6px; border: 0; outline: none; text-decoration: none;" />
                    Facebook
                  </a>
                  <a href="https://www.instagram.com/busmedaus_lt/" style="margin-left: 12px; color: #111827; text-decoration: none; display: inline-flex; align-items: center;">
                    <img src="cid:${INSTAGRAM_CID}" alt="Instagram" width="16" height="16" style="display: inline-block; margin-right: 6px; border: 0; outline: none; text-decoration: none;" />
                    Instagram
                  </a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderNotificationEmailHtml({
  subject,
  message,
  ctaUrl,
}: NotificationEmailContent): string {
  const paragraphHtml = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(
      (line) =>
        `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #1f2933;">${escapeHtml(
          line,
        )}</p>`,
    )
    .join('');

  return `<h1 style="font-size: 24px; line-height: 32px; margin: 0 0 24px 0; color: #111827;">${escapeHtml(
    subject,
  )}</h1>${paragraphHtml}`;
}

export function renderNotificationEmailText({
  message,
  ctaUrl,
  ctaLabel = DEFAULT_CTA_LABEL,
}: Pick<NotificationEmailContent, 'message' | 'ctaUrl'> & { ctaLabel?: string }): string {
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
