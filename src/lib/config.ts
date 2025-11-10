type AppRuntimeConfig = {
  apiBaseUrl?: string;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const isValidAbsoluteUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    // eslint-disable-next-line no-new
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
};

const resolveFromBusmedausHost = () => {
  if (typeof window === 'undefined' || !window.location) {
    return null;
  }

  const { host, hostname, protocol } = window.location;

  if (host === 'app.busmedaus.lt') {
    return 'https://api.busmedaus.lt';
  }

  if (hostname?.endsWith('.busmedaus.lt')) {
    const segments = hostname.split('.');
    if (segments.length > 0 && segments[0] !== 'api') {
      segments[0] = 'api';
      const inferredHost = segments.join('.');
      return `${protocol ?? 'https:'}//${inferredHost}`;
    }
  }

  return null;
};

const resolveApiBaseUrl = (): string => {
  const envValue = import.meta?.env?.VITE_API_BASE_URL;
  if (isValidAbsoluteUrl(envValue)) {
    return envValue.trim();
  }

  if (typeof window !== 'undefined') {
    const runtimeConfig = (window as typeof window & { __APP_CONFIG__?: AppRuntimeConfig }).__APP_CONFIG__;
    if (isValidAbsoluteUrl(runtimeConfig?.apiBaseUrl)) {
      return runtimeConfig!.apiBaseUrl!.trim();
    }
  }

  const hostDerived = resolveFromBusmedausHost();
  if (hostDerived) {
    return hostDerived;
  }

  if (import.meta?.env?.DEV) {
    return 'http://localhost:3000';
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'https://api.busmedaus.lt';
};

const normalizeBaseUrl = (value: string) => trimTrailingSlash(value || '').trim();

export const API_BASE_URL = normalizeBaseUrl(resolveApiBaseUrl());

if (import.meta.env?.DEV && typeof console !== 'undefined') {
  console.debug('[CONFIG]', { API_BASE_URL });
}
