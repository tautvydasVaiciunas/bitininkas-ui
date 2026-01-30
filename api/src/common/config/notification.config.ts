const normalizeEmail = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const ADMIN_NOTIFICATION_EMAIL =
  normalizeEmail(process.env.ADMIN_NOTIFICATION_EMAIL) ?? 'busmedausnotif@gmail.com';
