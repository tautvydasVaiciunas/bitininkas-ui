const rawApiBase = (import.meta.env.VITE_API_BASE_URL ?? '').toString();
export const API_BASE_URL = rawApiBase.replace(/\/$/, '');

