const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

const ACCESS_TOKEN_KEY = 'bitininkas_access_token';
const REFRESH_TOKEN_KEY = 'bitininkas_refresh_token';
const USER_STORAGE_KEY = 'bitininkas_user';

export class HttpError<T = unknown> extends Error {
  constructor(
    public readonly status: number,
    public readonly data: T,
    message?: string
  ) {
    super(message ?? `HTTP ${status}`);
    this.name = 'HttpError';
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  json?: unknown;
  body?: BodyInit | null;
  query?: Record<string, QueryValue>;
  skipAuth?: boolean;
}

interface InternalRequestOptions extends RequestOptions {
  _retry?: boolean;
}

export type UserRole = 'user' | 'manager' | 'admin';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  type: string;
  title?: string | null;
  message?: string | null;
  payload?: Record<string, unknown>;
  scheduledAt?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HiveStatus = 'active' | 'paused' | 'archived';

export interface HiveResponse {
  id: string;
  label: string;
  status: HiveStatus;
  location?: string | null;
  queenYear?: number | null;
  ownerUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HiveSummary {
  hiveId: string;
  assignmentsCount: number;
  completion: number;
}

export type TaskFrequency = 'once' | 'weekly' | 'monthly' | 'seasonal';

export interface TaskStepResponse {
  id: string;
  taskId: string;
  orderIndex: number;
  title: string;
  contentText?: string | null;
  mediaUrl?: string | null;
  createdAt: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  seasonMonths: number[];
  frequency: TaskFrequency;
  defaultDueDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithStepsResponse extends TaskResponse {
  steps: TaskStepResponse[];
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  category?: string | null;
  seasonMonths?: number[];
  frequency: TaskFrequency;
  defaultDueDays: number;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export interface CreateTaskStepPayload {
  title: string;
  contentText?: string | null;
  mediaUrl?: string | null;
}

export type UpdateTaskStepPayload = Partial<CreateTaskStepPayload> & {
  orderIndex?: number;
};

export type AssignmentStatus = 'not_started' | 'in_progress' | 'done';

export interface AssignmentResponse {
  id: string;
  hiveId: string;
  taskId: string;
  createdByUserId: string;
  dueDate: string;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StepProgressResponse {
  id: string;
  assignmentId: string;
  taskStepId: string;
  completedAt: string;
  notes?: string | null;
  evidenceUrl?: string | null;
}

export interface AssignmentDetails {
  assignment: AssignmentResponse;
  task: TaskWithStepsResponse;
  progress: StepProgressResponse[];
  completion: number;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface CreateHivePayload {
  label: string;
  location?: string;
  queenYear?: number;
  status?: HiveStatus;
  ownerUserId?: string;
}

export type UpdateHivePayload = Partial<CreateHivePayload>;

export interface CreateAssignmentPayload {
  hiveId: string;
  taskId: string;
  dueDate: string;
  status?: AssignmentStatus;
}

export interface UpdateAssignmentPayload {
  status?: AssignmentStatus;
  dueDate?: string;
}

export interface CompleteStepPayload {
  assignmentId: string;
  taskStepId: string;
  notes?: string;
  evidenceUrl?: string;
}

const isBrowser = typeof window !== 'undefined';

let accessToken = isBrowser ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;
let refreshTokenValue = isBrowser ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
let refreshPromise: Promise<boolean> | null = null;

const buildUrl = (path: string, query?: Record<string, QueryValue>) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE_URL;
  let url = base ? `${base}${normalizedPath}` : normalizedPath;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  return url;
};

const safeParse = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  if (!text) return undefined;
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch (error) {
      console.warn('Failed to parse JSON response', error);
    }
  }
  return text;
};

const persistUser = (user: AuthenticatedUser | undefined) => {
  if (!isBrowser) return;
  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
};

const setRefreshToken = (token: string | null) => {
  refreshTokenValue = token ?? null;
  if (!isBrowser) return;
  if (token) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

const getRefreshToken = () => {
  if (refreshTokenValue) return refreshTokenValue;
  if (isBrowser) {
    refreshTokenValue = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return refreshTokenValue;
};

export const setToken = (token: string | null, refresh?: string | null) => {
  accessToken = token ?? null;
  if (isBrowser) {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }
  if (refresh !== undefined) {
    setRefreshToken(refresh);
  } else if (token === null) {
    setRefreshToken(null);
  }
};

export const clearCredentials = () => {
  setToken(null, null);
  persistUser(undefined);
};

const redirectToLogin = () => {
  if (!isBrowser) return;
  if (window.location.pathname === '/auth/login') return;
  window.location.href = '/auth/login';
};

const attemptTokenRefresh = async () => {
  const token = getRefreshToken();
  if (!token) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: token }),
        });

        if (!response.ok) {
          return false;
        }

        const data = (await safeParse(response)) as AuthResponse | undefined;
        if (!data) {
          return false;
        }

        setToken(data.accessToken, data.refreshToken);
        persistUser(data.user);
        return true;
      } catch (error) {
        console.error('Failed to refresh token', error);
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
};

const request = async <T>(
  method: HttpMethod,
  path: string,
  options: InternalRequestOptions = {}
): Promise<T> => {
  const { json, body, query, skipAuth = false, headers, _retry, ...rest } = options;
  const url = buildUrl(path, query);
  const finalHeaders = new Headers(headers);

  if (!finalHeaders.has('Accept')) {
    finalHeaders.set('Accept', 'application/json');
  }

  let requestBody = body ?? null;
  if (json !== undefined) {
    requestBody = JSON.stringify(json);
    if (!finalHeaders.has('Content-Type')) {
      finalHeaders.set('Content-Type', 'application/json');
    }
  }

  if (!skipAuth && accessToken && !finalHeaders.has('Authorization')) {
    finalHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    ...rest,
    method,
    headers: finalHeaders,
    body: requestBody,
  });

  if (response.status === 401 && !skipAuth) {
    const refreshed = !_retry ? await attemptTokenRefresh() : false;
    if (refreshed) {
      return request<T>(method, path, { ...options, _retry: true });
    }
    clearCredentials();
    redirectToLogin();
    const errorData = await safeParse(response);
    throw new HttpError(response.status, errorData, 'Unauthorized');
  }

  const data = await safeParse(response);
  if (!response.ok) {
    throw new HttpError(response.status, data, response.statusText);
  }

  return data as T;
};

export const get = <T>(path: string, options?: RequestOptions) =>
  request<T>('GET', path, options);

export const post = <T>(path: string, options?: RequestOptions) =>
  request<T>('POST', path, options);

export const patch = <T>(path: string, options?: RequestOptions) =>
  request<T>('PATCH', path, options);

export const del = <T>(path: string, options?: RequestOptions) =>
  request<T>('DELETE', path, options);

export const api = {
  auth: {
    login: async (payload: LoginPayload) => {
      const result = await post<AuthResponse>('/auth/login', {
        json: payload,
        skipAuth: true,
      });
      setToken(result.accessToken, result.refreshToken);
      persistUser(result.user);
      return result;
    },
    register: async (payload: RegisterPayload) => {
      const result = await post<AuthResponse>('/auth/register', {
        json: payload,
        skipAuth: true,
      });
      setToken(result.accessToken, result.refreshToken);
      persistUser(result.user);
      return result;
    },
    refresh: async (refreshToken: string) => {
      const result = await post<AuthResponse>('/auth/refresh', {
        json: { refreshToken },
        skipAuth: true,
      });
      setToken(result.accessToken, result.refreshToken);
      persistUser(result.user);
      return result;
    },
    me: () => get<AuthenticatedUser>('/auth/me'),
    requestPasswordReset: (email: string) =>
      post<{ message: string }>('/auth/request-reset', {
        json: { email },
        skipAuth: true,
      }),
    logout: () => {
      clearCredentials();
    },
  },
  notifications: {
    list: () => get<NotificationResponse[]>('/notifications'),
    markRead: (id: string) => patch<NotificationResponse>(`/notifications/${id}/read`),
  },
  hives: {
    list: (params?: { status?: HiveStatus }) => get<HiveResponse[]>('/hives', { query: params }),
    details: (id: string) => get<HiveResponse>(`/hives/${id}`),
    create: (payload: CreateHivePayload) => post<HiveResponse>('/hives', { json: payload }),
    update: (id: string, payload: UpdateHivePayload) =>
      patch<HiveResponse>(`/hives/${id}`, { json: payload }),
    remove: (id: string) => del<void>(`/hives/${id}`),
    summary: (id: string) => get<HiveSummary>(`/hives/${id}/summary`),
  },
  tasks: {
    list: (params?: { category?: string; frequency?: TaskFrequency; seasonMonth?: number }) =>
      get<TaskResponse[]>('/tasks', { query: params }),
    get: (id: string) => get<TaskResponse>(`/tasks/${id}`),
    getSteps: (id: string) => get<TaskStepResponse[]>(`/tasks/${id}/steps`),
    create: (payload: CreateTaskPayload) => post<TaskResponse>('/tasks', { json: payload }),
    update: (id: string, payload: UpdateTaskPayload) =>
      patch<TaskResponse>(`/tasks/${id}`, { json: payload }),
    createStep: (taskId: string, payload: CreateTaskStepPayload) =>
      post<TaskStepResponse>(`/tasks/${taskId}/steps`, { json: payload }),
    updateStep: (taskId: string, stepId: string, payload: UpdateTaskStepPayload) =>
      patch<TaskStepResponse>(`/tasks/${taskId}/steps/${stepId}`, { json: payload }),
    deleteStep: (taskId: string, stepId: string) => del<void>(`/tasks/${taskId}/steps/${stepId}`),
    reorderSteps: (id: string, payload: { stepIds: string[] }) =>
      post<TaskStepResponse[]>(`/tasks/${id}/steps/reorder`, { json: payload }),
  },
  assignments: {
    list: (params?: { hiveId?: string }) => get<AssignmentResponse[]>('/assignments', { query: params }),
    create: (payload: CreateAssignmentPayload) => post<AssignmentResponse>('/assignments', { json: payload }),
    update: (id: string, payload: UpdateAssignmentPayload) =>
      patch<AssignmentResponse>(`/assignments/${id}`, { json: payload }),
    details: (id: string) => get<AssignmentDetails>(`/assignments/${id}/details`),
  },
  progress: {
    completeStep: (payload: CompleteStepPayload) =>
      post<StepProgressResponse>('/progress/step-complete', { json: payload }),
    listForAssignment: (assignmentId: string) =>
      get<StepProgressResponse[]>(`/assignments/${assignmentId}/progress/list`),
    assignmentCompletion: (assignmentId: string) =>
      get<number>(`/assignments/${assignmentId}/progress`),
    remove: (id: string) => del<void>(`/progress/${id}`),
  },
  users: {
    list: () => get<AdminUserResponse[]>('/users'),
    update: (id: string, payload: UpdateUserPayload) =>
      patch<AdminUserResponse>(`/users/${id}`, { json: payload }),
    remove: (id: string) => del<void>(`/users/${id}`),
  },
};

export default api;
