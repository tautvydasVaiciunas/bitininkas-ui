import { Request } from 'express';

export function resolveRequestBaseUrl(req: Request): string | null {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'] ?? req.headers['x-forwarded-server'];
  const protocol =
    (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(',')[0]?.trim() ??
    req.protocol;
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)?.split(',')[0]?.trim() ??
    req.get('host');

  if (!protocol || !host) {
    return null;
  }

  return `${protocol}://${host}`;
}
