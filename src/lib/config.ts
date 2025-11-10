import { markInit } from './cycleGuard';

markInit('lib/config');

const rawApiBase = (import.meta?.env?.VITE_API_BASE_URL ?? '').toString();

export const API_BASE_URL = rawApiBase.replace(/\/$/, '');
export const IS_DEV = Boolean(import.meta?.env?.DEV);

declare global {
  interface Window {
    __bitConfigLogged?: boolean;
  }
}

if (typeof window !== 'undefined' && !window.__bitConfigLogged) {
  window.__bitConfigLogged = true;
  if (IS_DEV && typeof console !== 'undefined') {
    console.debug('[BOOT]', { DEV: IS_DEV, API_BASE_URL });
  }
}
