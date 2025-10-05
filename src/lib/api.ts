const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T; // no content
  return (await res.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) =>
    apiFetch<{ id: string; email: string; role: string; name?: string }>("/auth/me", {}, token),

  // Pavyzdžiai – pririšk UI sąrašus/formas:
  listHives: (token: string) =>
    apiFetch<Array<{ id: string; label: string; status: string }>>("/hives", {}, token),

  createHive: (token: string, dto: { label: string; status?: string }) =>
    apiFetch<{ id: string }>("/hives", { method: "POST", body: JSON.stringify(dto) }, token),

  updateHive: (token: string, id: string, dto: { label?: string; status?: string }) =>
    apiFetch(`/hives/${id}`, { method: "PATCH", body: JSON.stringify(dto) }, token),

  deleteHive: (token: string, id: string) =>
    apiFetch<void>(`/hives/${id}`, { method: "DELETE" }, token),

  notifications: (token: string) =>
    apiFetch<Array<{ id: string; type: string; payload: any; createdAt: string }>>(
      "/notifications",
      {},
      token
    ),
};
