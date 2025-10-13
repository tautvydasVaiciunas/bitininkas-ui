import ltMessages from '@/i18n/messages.lt.json';
import { HttpError } from './api';

const VALIDATION_FALLBACK = 'Neteisingi duomenys';

const normalizeMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
    if (parts.length > 0) {
      return parts.join('\n');
    }
  }

  return undefined;
};

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof HttpError) {
    const data = error.data as { message?: unknown } | undefined;
    const fromPayload = normalizeMessage(data?.message);
    if (fromPayload) {
      return fromPayload;
    }

    if (error.status === 400 || error.status === 422) {
      return VALIDATION_FALLBACK;
    }

    const message = typeof error.message === 'string' ? error.message.trim() : '';
    if (message && message !== `HTTP ${error.status}`) {
      return message;
    }

    return ltMessages.errors.unexpected;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.length > 0) {
      return message;
    }
  }

  return ltMessages.errors.unexpected;
};
