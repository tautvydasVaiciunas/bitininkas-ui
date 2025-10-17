import ltMessages from '@/i18n/messages.lt.json';

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

export interface NotificationsUnreadCountResponse {
  count: number;
}

export type HiveStatus = 'active' | 'paused' | 'archived';

export interface HiveMemberResponse {
  id: string;
  email: string;
  name?: string | null;
}

export interface HiveResponse {
  id: string;
  label: string;
  status: HiveStatus;
  location?: string | null;
  queenYear?: number | null;
  ownerUserId?: string;
  createdAt?: string;
  updatedAt?: string;
  members?: HiveMemberResponse[];
}

export interface HiveSummary {
  hiveId: string;
  assignmentsCount: number;
  completion: number;
}

export type TaskFrequency = 'once' | 'weekly' | 'monthly' | 'seasonal';

export type TaskStepMediaType = 'image' | 'video';

export interface TagResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStepResponse {
  id: string;
  taskId: string;
  orderIndex: number;
  title: string;
  contentText?: string | null;
  mediaUrl?: string | null;
  mediaType?: TaskStepMediaType | null;
  requireUserMedia: boolean;
  createdAt: string;
  tags: TagResponse[];
}

export interface MediaUploadResponse {
  url: string;
}

export interface TemplateStepResponse {
  id: string;
  templateId: string;
  taskStepId: string;
  orderIndex: number;
  taskStep: TaskStepResponse;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateResponse {
  id: string;
  title: string;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  steps: TemplateStepResponse[];
}

export interface NewsGroupResponse {
  id: string;
  name: string;
}

export interface NewsPostResponse {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  targetAll: boolean;
  groups: NewsGroupResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNewsResponse {
  items: NewsPostResponse[];
  page: number;
  limit: number;
  hasMore: boolean;
  total: number;
}

export interface CreateNewsPayload {
  title: string;
  body: string;
  imageUrl?: string | null;
  targetAll: boolean;
  groupIds?: string[];
}

export type UpdateNewsPayload = Partial<CreateNewsPayload>;

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
  steps?: CreateTaskStepPayload[];
}

export type UpdateTaskPayload = Partial<Omit<CreateTaskPayload, 'steps'>> & {
  steps?: CreateTaskStepPayload[];
};

export interface CreateTaskStepPayload {
  title: string;
  description?: string | null;
  contentText?: string | null;
  mediaUrl?: string | null;
  mediaType?: TaskStepMediaType | null;
  requireUserMedia?: boolean;
  tagIds?: string[];
}

export type UpdateTaskStepPayload = Partial<CreateTaskStepPayload> & {
  orderIndex?: number;
};

export type CreateGlobalTaskStepPayload = CreateTaskStepPayload;

export interface TemplateStepWithOrderPayload {
  stepId: string;
  order: number;
}

export interface CreateTemplatePayload {
  title: string;
  comment?: string | null;
  stepsWithOrder: TemplateStepWithOrderPayload[];
  steps?: string[];
}

export interface UpdateTemplatePayload {
  title?: string;
  comment?: string | null;
  stepsWithOrder?: TemplateStepWithOrderPayload[];
  steps?: string[];
}

export interface ReorderTemplateStepsPayload {
  stepIds: string[];
}

export type AssignmentStatus = 'not_started' | 'in_progress' | 'done';

export interface AssignmentResponse {
  id: string;
  hiveId: string;
  taskId: string;
  createdByUserId: string;
  dueDate: string;
  startDate?: string | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMemberUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface GroupMemberResponse {
  id: string;
  groupId: string;
  userId: string;
  role?: string | null;
  createdAt: string;
  user?: GroupMemberUser;
}

export interface GroupResponse {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  members?: GroupMemberResponse[];
}

export interface CreateGroupPayload {
  name: string;
  description?: string | null;
}

export type UpdateGroupPayload = Partial<CreateGroupPayload>;

export interface AddGroupMemberPayload {
  userId: string;
  role?: string | null;
}

export interface AssignmentReportRow {
  userId: string;
  userName: string;
  assignmentId: string | null;
  status: AssignmentStatus | null;
  completedSteps: number;
  totalSteps: number;
  overdue: boolean;
  dueDate: string | null;
}

export interface ProfileResponse {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface StepProgressResponse {
  id: string;
  assignmentId: string;
  taskStepId: string;
  completedAt: string;
  notes?: string | null;
  evidenceUrl?: string | null;
}

export interface StepProgressCompletedResponse {
  completed: true;
  taskStepId: string;
  progress: StepProgressResponse;
}

export interface StepProgressRemovedResponse {
  completed: false;
  taskStepId: string;
  progressId: string;
}

export type StepProgressToggleResponse =
  | StepProgressCompletedResponse
  | StepProgressRemovedResponse;

export interface AssignmentDetails {
  assignment: AssignmentResponse;
  task: TaskWithStepsResponse;
  progress: StepProgressResponse[];
  completion: number;
}

export interface AdminUserGroup {
  id: string;
  name: string;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  groups: AdminUserGroup[];
}

export interface CreateUserPayload {
  name?: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserPayload {
  name?: string | null;
  email?: string;
  password?: string;
}

export interface UpdateUserRolePayload {
  role: UserRole;
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
  members?: string[];
}

export type UpdateHivePayload = Partial<CreateHivePayload>;

export interface CreateAssignmentPayload {
  hiveId: string;
  taskId: string;
  dueDate: string;
  status?: AssignmentStatus;
  startDate?: string | null;
}

export interface UpdateAssignmentPayload {
  status?: AssignmentStatus;
  dueDate?: string;
  startDate?: string | null;
}

export interface BulkAssignmentsFromTemplatePayload {
  templateId: string;
  groupIds: string[];
  title: string;
  description?: string;
  startDate: string;
  dueDate: string;
  notify?: boolean;
}

export interface BulkAssignmentsFromTemplateResponse {
  created: number;
  groups: number;
  templateId: string;
  startDate: string;
  dueDate: string;
}

export interface CompleteStepPayload {
  assignmentId: string;
  taskStepId: string;
  notes?: string;
  evidenceUrl?: string;
}

export interface UpdateProgressPayload {
  notes?: string | null;
  evidenceUrl?: string | null;
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

const statusErrorMessages: Record<number, string> = {
  400: 'Neteisingi duomenys',
  401: ltMessages.errors.invalidCredentials,
  403: ltMessages.errors.forbidden,
  422: ltMessages.errors.invalidInput,
  500: ltMessages.errors.serverError,
};

const getErrorMessage = (status: number, data: unknown, fallback?: string) => {
  if (data && typeof data === 'object') {
    const possibleMessage = (data as { message?: unknown }).message;
    if (typeof possibleMessage === 'string' && possibleMessage.trim().length > 0) {
      return possibleMessage;
    }

    if (Array.isArray(possibleMessage)) {
      const filtered = possibleMessage.filter((item): item is string => typeof item === 'string');
      if (filtered.length > 0) {
        return filtered.join('\n');
      }
    }
  }

  if (typeof data === 'string' && data.trim().length > 0) {
    return data;
  }

  if (status in statusErrorMessages) {
    return statusErrorMessages[status];
  }

  if (status >= 500) {
    return ltMessages.errors.serverError;
  }

  return fallback ?? ltMessages.errors.unexpected;
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
    throw new HttpError(
      response.status,
      errorData,
      getErrorMessage(response.status, errorData, 'Unauthorized'),
    );
  }

  const data = await safeParse(response);
  if (!response.ok) {
    throw new HttpError(
      response.status,
      data,
      getErrorMessage(response.status, data, response.statusText),
    );
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
  media: {
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return post<MediaUploadResponse>('/media/upload', { body: formData });
    },
  },
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
      post<{ message: string; token?: string }>('/auth/request-reset', {
        json: { email },
        skipAuth: true,
      }),
    logout: () => {
      clearCredentials();
    },
  },
  notifications: {
    list: () => get<NotificationResponse[]>('/notifications'),
    markRead: (id: string) => patch<{ success: boolean }>(`/notifications/${id}/read`),
    unreadCount: () => get<NotificationsUnreadCountResponse>('/notifications/unread-count'),
  },
  news: {
    list: (params?: { page?: number; limit?: number }) =>
      get<PaginatedNewsResponse>('/news', { query: params }),
    get: (id: string) => get<NewsPostResponse>(`/news/${id}`),
    admin: {
      list: (params?: { page?: number; limit?: number }) =>
        get<PaginatedNewsResponse>('/admin/news', { query: params }),
      get: (id: string) => get<NewsPostResponse>(`/admin/news/${id}`),
      create: (payload: CreateNewsPayload) =>
        post<NewsPostResponse>('/admin/news', { json: payload }),
      update: (id: string, payload: UpdateNewsPayload) =>
        patch<NewsPostResponse>(`/admin/news/${id}`, { json: payload }),
      remove: (id: string) => del<{ success: boolean }>(`/admin/news/${id}`),
    },
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
    getSteps: (id: string, params?: { tagId?: string }) =>
      get<TaskStepResponse[]>(`/tasks/${id}/steps`, { query: params }),
    create: (payload: CreateTaskPayload) => post<TaskResponse>('/tasks', { json: payload }),
    update: (id: string, payload: UpdateTaskPayload) =>
      patch<TaskResponse>(`/tasks/${id}`, { json: payload }),
    createStep: (taskId: string, payload: CreateTaskStepPayload) =>
      post<TaskStepResponse>(`/tasks/${taskId}/steps`, { json: payload }),
    updateStep: (taskId: string, stepId: string, payload: UpdateTaskStepPayload) =>
      patch<TaskStepResponse>(`/tasks/${taskId}/steps/${stepId}`, { json: payload }),
    deleteStep: (taskId: string, stepId: string) => del<void>(`/tasks/${taskId}/steps/${stepId}`),
    reorderSteps: (
      id: string,
      payload: { steps: { stepId: string; orderIndex: number }[] },
    ) => post<TaskStepResponse[]>(`/tasks/${id}/steps/reorder`, { json: payload }),
  },
  templates: {
    list: () => get<TemplateResponse[]>('/templates'),
    get: (id: string) => get<TemplateResponse>(`/templates/${id}`),
    create: (payload: CreateTemplatePayload) => post<TemplateResponse>('/templates', { json: payload }),
    update: (id: string, payload: UpdateTemplatePayload) =>
      patch<TemplateResponse>(`/templates/${id}`, { json: payload }),
    remove: (id: string) => del<void>(`/templates/${id}`),
    reorderSteps: (id: string, payload: ReorderTemplateStepsPayload) =>
      patch<TemplateResponse>(`/templates/${id}/steps/reorder`, { json: payload }),
  },
  steps: {
    list: (params?: { taskId?: string; tagId?: string }) => get<TaskStepResponse[]>('/steps', { query: params }),
    listGlobal: (params?: { tagId?: string }) => get<TaskStepResponse[]>('/steps/global', { query: params }),
    create: (payload: CreateGlobalTaskStepPayload) => post<TaskStepResponse>('/steps', { json: payload }),
    update: (id: string, payload: UpdateTaskStepPayload) => patch<TaskStepResponse>(`/steps/${id}`, { json: payload }),
    remove: (id: string) => del<void>(`/steps/${id}`),
  },
  tags: {
    list: () => get<TagResponse[]>('/tags'),
    create: (payload: { name: string }) => post<TagResponse>('/tags', { json: payload }),
    update: (id: string, payload: { name: string }) => patch<TagResponse>(`/tags/${id}`, { json: payload }),
    remove: (id: string) => del<void>(`/tags/${id}`),
  },
  assignments: {
    list: (params?: {
      hiveId?: string;
      status?: AssignmentStatus;
      groupId?: string;
      availableNow?: boolean;
    }) =>
      get<AssignmentResponse[]>('/assignments', { query: params }),
    create: (payload: CreateAssignmentPayload) => post<AssignmentResponse>('/assignments', { json: payload }),
    update: (id: string, payload: UpdateAssignmentPayload) =>
      patch<AssignmentResponse>(`/assignments/${id}`, { json: payload }),
    details: (id: string) => get<AssignmentDetails>(`/assignments/${id}/details`),
    bulkFromTemplate: (payload: BulkAssignmentsFromTemplatePayload) =>
      post<BulkAssignmentsFromTemplateResponse>('/assignments/bulk-from-template', { json: payload }),
  },
  profile: {
    update: (payload: UpdateProfilePayload) => patch<ProfileResponse>('/profile', { json: payload }),
    changePassword: (payload: ChangePasswordPayload) =>
      patch<{ success: boolean }>('/profile/password', { json: payload }),
  },
  groups: {
    list: () => get<GroupResponse[]>('/groups'),
    get: (id: string) => get<GroupResponse>(`/groups/${id}`),
    create: (payload: CreateGroupPayload) => post<GroupResponse>('/groups', { json: payload }),
    update: (id: string, payload: UpdateGroupPayload) =>
      patch<GroupResponse>(`/groups/${id}`, { json: payload }),
    remove: (id: string) => del<void>(`/groups/${id}`),
    members: {
      list: (groupId: string) => get<GroupMemberResponse[]>(`/groups/${groupId}/members`),
      add: (groupId: string, payload: AddGroupMemberPayload) =>
        post<GroupMemberResponse>(`/groups/${groupId}/members`, { json: payload }),
      remove: (groupId: string, userId: string) =>
        del<void>(`/groups/${groupId}/members/${userId}`),
    },
  },
  reports: {
    assignments: (params: { groupId: string; taskId?: string }) =>
      get<AssignmentReportRow[]>('/reports/assignments', { query: params }),
  },
  progress: {
    completeStep: (payload: CompleteStepPayload) =>
      post<StepProgressToggleResponse>('/progress/step-complete', { json: payload }),
    update: (id: string, payload: UpdateProgressPayload) =>
      patch<StepProgressResponse>(`/progress/${id}`, { json: payload }),
    listForAssignment: (assignmentId: string) =>
      get<StepProgressResponse[]>(`/assignments/${assignmentId}/progress/list`),
    assignmentCompletion: (assignmentId: string) =>
      get<number>(`/assignments/${assignmentId}/progress`),
    remove: (id: string) => del<void>(`/progress/${id}`),
  },
  users: {
    list: () => get<AdminUserResponse[]>('/users'),
    get: (id: string) => get<AdminUserResponse>(`/users/${id}`),
    create: (payload: CreateUserPayload) => post<AdminUserResponse>('/users', { json: payload }),
    update: (id: string, payload: UpdateUserPayload) =>
      patch<AdminUserResponse>(`/users/${id}`, { json: payload }),
    updateRole: (id: string, payload: UpdateUserRolePayload) =>
      patch<AdminUserResponse>(`/users/${id}/role`, { json: payload }),
    remove: (id: string) => del<void>(`/users/${id}`),
  },
};

export default api;
