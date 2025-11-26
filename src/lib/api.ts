import ltMessages from '@/i18n/messages.lt.json';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

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

export type UserRole = 'user' | 'manager' | 'moderator' | 'admin';

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

export type NotificationType = 'assignment' | 'news' | 'message' | 'hive_history';

export interface NotificationResponse {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsUnreadCountResponse {
  count: number;
}

export interface SupportAttachmentPayload {
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind: 'image' | 'video' | 'other';
}

export type ManualNoteAttachmentPayload = SupportAttachmentPayload;

export interface SupportUploadResponse {
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind: 'image' | 'video' | 'other';
}

export interface CreateManualNotePayload {
  text: string;
  attachments?: ManualNoteAttachmentPayload[];
}

export interface UpdateManualNotePayload {
  text?: string;
  attachments?: ManualNoteAttachmentPayload[];
}

export interface SupportMessageResponse {
  id: string;
  senderRole: 'user' | 'admin' | 'manager' | 'system';
  text?: string | null;
  createdAt: string;
  attachments?: SupportAttachmentPayload[];
}

export interface SupportThreadAdminResponse {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  status: string;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  unreadFromUser: number;
}

export interface SupportUnreadResponse {
  unread: boolean;
}

export interface AdminSupportUnreadResponse {
  count: number;
}

export interface SendTestEmailPayload {
  to: string;
  subject?: string;
  body?: string;
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
  tagId?: string | null;
  tag?: HiveTagResponse | null;
  ownerUserId?: string;
  owner?: {
    id: string;
    email: string;
    name?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
  members?: HiveMemberResponse[];
}

export interface HiveTagResponse {
  id: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export type HiveEventType =
  | 'HIVE_UPDATED'
  | 'TASK_ASSIGNED'
  | 'TASK_DATES_CHANGED'
  | 'TASK_COMPLETED'
  | 'MANUAL_NOTE';

export interface HiveHistoryEventUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface HiveHistoryEventResponse {
  id: string;
  hiveId: string;
  type: HiveEventType;
  payload: Record<string, unknown>;
  user?: HiveHistoryEventUser | null;
  createdAt: string;
}

export interface CreateHiveTagPayload {
  name: string;
  color?: string;
}

export interface HiveSummary {
  hiveId: string;
  assignmentsCount: number;
  completion: number;
  activeAssignmentsCount: number;
  overdueAssignmentsCount: number;
  primaryAssignmentProgress: number | null;
  primaryAssignmentId: string | null;
  primaryAssignmentStartDate: string | null;
  primaryAssignmentDueDate: string | null;
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
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  steps: TemplateStepResponse[];
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
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
  attachedTaskId: string | null;
  assignmentStartDate: string | null;
  assignmentDueDate: string | null;
  sendNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNewsResponse extends PaginatedResponse<NewsPostResponse> {
  hasMore: boolean;
}

export interface StoreProduct {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string;
  imageUrls: string[];
  priceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreOrderItemResponse {
  productId: string | null;
  productTitle: string;
  quantity: number;
  unitNetCents: number;
  unitGrossCents: number;
  lineNetCents: number;
  lineGrossCents: number;
}

export type StoreOrderStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';

export interface StoreOrderResponse {
  id: string;
  status: StoreOrderStatus;
  customerName: string;
  customerEmail: string;
  subtotalNetCents: number;
  vatCents: number;
  totalGrossCents: number;
  totalAmountCents: number;
  createdAt: string;
  items: StoreOrderItemResponse[];
}

export interface StoreOrderListItem {
  id: string;
  status: StoreOrderStatus;
  customerName: string;
  customerEmail: string;
  subtotalNetCents: number;
  vatCents: number;
  totalGrossCents: number;
  totalAmountCents: number;
  createdAt: string;
}

export interface StoreMyOrderItem {
  productTitle: string;
  quantity: number;
}

export interface StoreMyOrder {
  id: string;
  status: StoreOrderStatus;
  createdAt: string;
  subtotalNetCents: number;
  vatCents: number;
  totalGrossCents: number;
  totalAmountCents: number;
  items: StoreMyOrderItem[];
}

export interface AdminStoreProductPayload {
  slug: string;
  title: string;
  shortDescription?: string | null;
  description: string;
  priceCents: number;
  isActive?: boolean;
  imageUrls?: string[];
}

export interface CreateStoreOrderPayload {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    comment?: string;
  };
}

export interface CreateNewsPayload {
  title: string;
  body: string;
  imageUrl?: string | null;
  targetAll: boolean;
  groupIds?: string[];
  attachedTaskId?: string | null;
  assignmentStartDate?: string | null;
  assignmentDueDate?: string | null;
  sendNotifications?: boolean;
}

export type UpdateNewsPayload = Partial<CreateNewsPayload>;

export interface TaskResponse {
  id: string;
  title: string;
  category?: string | null;
  seasonMonths: number[];
  frequency: TaskFrequency;
  defaultDueDays: number;
  createdAt: string;
  updatedAt: string;
  templateId?: string | null;
  templateName?: string | null;
  latestNews?: {
    assignmentStartDate?: string | null;
    assignmentDueDate?: string | null;
    groups: NewsGroupResponse[];
  } | null;
}

export type TaskStatusFilter = 'active' | 'archived' | 'past' | 'all';

export interface TaskWithStepsResponse extends TaskResponse {
  steps: TaskStepResponse[];
}

export interface CreateTaskPayload {
  title: string;
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

export interface CreateTemplatePayload {
  name: string;
  description?: string | null;
  stepIds?: string[];
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string | null;
  stepIds?: string[];
}

export interface ReorderTemplateStepsPayload {
  stepIds: string[];
}

export type AssignmentReviewStatus = 'pending' | 'approved' | 'rejected';
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
  archived?: boolean;
  rating?: number | null;
  ratingComment?: string | null;
  completedAt?: string | null;
  reviewStatus?: AssignmentReviewStatus;
  reviewComment?: string | null;
  reviewByUserId?: string | null;
  reviewAt?: string | null;
  ratedAt?: string | null;
}

export interface SubmitAssignmentRatingPayload {
  rating: number;
  ratingComment?: string | null;
}

export interface SubmitAssignmentReviewPayload {
  status: AssignmentReviewStatus | 'approved' | 'rejected';
  comment?: string | null;
}

export interface AssignmentReviewQueueItem {
  id: string;
  taskTitle: string;
  hiveLabel: string;
  hiveId: string;
  userName: string;
  rating: number | null;
  ratingComment: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  reviewStatus: AssignmentReviewStatus;
  reviewComment: string | null;
  reviewAt: string | null;
  reviewByUserId: string | null;
}

export interface AssignmentReviewQueueResponse {
  data: AssignmentReviewQueueItem[];
  total: number;
  page: number;
  limit: number;
  counts: Record<AssignmentReviewStatus, number>;
}

export type AssignmentAnalyticsStatus = 'all' | 'active' | 'completed' | 'overdue';

export interface AssignmentAnalyticsRow {
  assignmentId: string;
  taskId: string;
  taskTitle: string;
  hiveId: string | null;
  hiveLabel: string;
  userId: string | null;
  userName: string;
  status: AssignmentStatus;
  overdue: boolean;
  rating: number | null;
  ratingComment: string | null;
  completedAt: string | null;
  dueDate: string | null;
  startDate: string | null;
}

export interface AssignmentAnalyticsSummary {
  total: number;
  completed: number;
  avgRating: number | null;
  uniqueUsers: number;
  completedUsers: number;
}

export interface AssignmentAnalyticsResponse {
  summary: AssignmentAnalyticsSummary;
  data: AssignmentAnalyticsRow[];
  total: number;
  page: number;
  limit: number;
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
  hiveId?: string | null;
  role?: string | null;
  createdAt: string;
  user?: GroupMemberUser;
  hive?: HiveResponse | null;
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
  hiveId?: string | null;
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

export type StepProgressStatus = 'pending' | 'completed';

export interface StepProgressResponse {
  id: string;
  assignmentId: string;
  taskStepId: string;
  userId: string;
  status: StepProgressStatus;
  completedAt?: string | null;
  notes?: string | null;
  evidenceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StepProgressToggleResponse {
  status: StepProgressStatus;
  taskStepId: string;
  progress: StepProgressResponse;
}

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
  password?: string;
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

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface CreateHivePayload {
  label: string;
  location?: string;
  status?: HiveStatus;
  ownerUserId?: string;
  members?: string[];
  tagId?: string | null;
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
  userId?: string;
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

  if (_retry) {
    finalHeaders.set('X-Auth-Retry', 'refresh');
  }

  if (!skipAuth && refreshPromise) {
    const refreshReady = await refreshPromise;
    if (!refreshReady) {
      clearCredentials();
      redirectToLogin();
      throw new HttpError(401, undefined, ltMessages.errors.invalidCredentials);
    }
  }

  if (!skipAuth && accessToken && !finalHeaders.has('Authorization')) {
    finalHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    ...rest,
    credentials: rest.credentials ?? 'include',
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

const attachPaginationMetadata = <T>(response: PaginatedResponse<T>) => {
  const data = Array.isArray(response.data) ? [...response.data] : [];

  return Object.assign(data, {
    page: response.page,
    limit: response.limit,
    total: response.total,
  });
};

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
    forgotPassword: (email: string) => {
      const normalized = email.trim().toLowerCase();
      return post<{ message: string }>('/auth/forgot-password', {
        json: { email: normalized },
        skipAuth: true,
      });
    },
    resetPassword: (payload: ResetPasswordPayload) =>
      post<{ message: string }>('/auth/reset-password', {
        json: payload,
        skipAuth: true,
      }),
    logout: () => {
      clearCredentials();
    },
  },
  notifications: {
    list: (params?: { page?: number; limit?: number }) => {
      const query = {
        ...params,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
      };

      return get<PaginatedResponse<NotificationResponse>>('/notifications', { query }).then(
        attachPaginationMetadata,
      );
    },
    markRead: (id: string) => patch<{ success: boolean }>(`/notifications/${id}/read`),
    markAllRead: () => patch<{ success: boolean }>('/notifications/mark-all-read'),
    unreadCount: () => get<NotificationsUnreadCountResponse>('/notifications/unread-count'),
  },
  support: {
    myThread: () => get<{ id: string; status: string; lastMessageAt: string | null }>('/support/my-thread'),
    myThreadMessages: (params?: { limit?: number; cursor?: string }) =>
      get<SupportMessageResponse[]>('/support/my-thread/messages', { query: params }),
    createMessage: (payload: { text?: string; attachments?: SupportAttachmentPayload[] }) =>
      post<SupportMessageResponse>('/support/my-thread/messages', { json: payload }),
    unread: () => get<SupportUnreadResponse>('/support/my-thread/unread'),
    uploadAttachment: (form: FormData) =>
      post<SupportUploadResponse>('/support/upload', { body: form }),
      admin: {
        threads: (params?: { query?: string; status?: string; limit?: number; page?: number }) =>
          get<SupportThreadAdminResponse[]>('/admin/support/threads', { query: params }),
        threadMessages: (id: string, params?: { limit?: number; cursor?: string }) =>
          get<SupportMessageResponse[]>(`/admin/support/threads/${id}/messages`, { query: params }),
        createMessage: (id: string, payload: { text?: string; attachments?: SupportAttachmentPayload[] }) =>
          post<SupportMessageResponse>(`/admin/support/threads/${id}/messages`, { json: payload }),
        ensureThread: (userId: string) =>
          post<SupportThreadAdminResponse>('/admin/support/threads', { json: { userId } }),
        unreadCount: () =>
          get<AdminSupportUnreadResponse>('/admin/support/unread-count'),
      },
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
    members: (id: string) => get<HiveMemberResponse[]>(`/hives/${id}/members`),
    listForUser: (userId: string, params?: { includeArchived?: boolean }) =>
      get<HiveResponse[]>(`/hives/user/${userId}`, { query: params }),
    create: (payload: CreateHivePayload) => post<HiveResponse>('/hives', { json: payload }),
    update: (id: string, payload: UpdateHivePayload) =>
      patch<HiveResponse>(`/hives/${id}`, { json: payload }),
    remove: (id: string) => del<void>(`/hives/${id}`),
    summary: (id: string) => get<HiveSummary>(`/hives/${id}/summary`),
    history: (id: string, params?: { page?: number; limit?: number }) =>
      get<PaginatedResponse<HiveHistoryEventResponse>>(`/hives/${id}/history`, {
        query: params,
      }),
    manualNotes: {
      create: (id: string, payload: CreateManualNotePayload) =>
        post<HiveHistoryEventResponse>(`/hives/${id}/history/manual`, { json: payload }),
      update: (eventId: string, payload: UpdateManualNotePayload) =>
        patch<HiveHistoryEventResponse>(`/hives/history/${eventId}`, { json: payload }),
      delete: (eventId: string) => del<void>(`/hives/history/${eventId}`),
    },
  },
  tasks: {
    list: (params?: {
      category?: string;
      frequency?: TaskFrequency;
      seasonMonth?: number;
      status?: TaskStatusFilter;
    }) =>
      get<TaskResponse[]>('/tasks', { query: params }),
    get: (id: string) => get<TaskResponse>(`/tasks/${id}`),
    getSteps: (id: string, params?: { tagId?: string }) =>
      get<TaskStepResponse[]>(`/tasks/${id}/steps`, { query: params }),
    create: (payload: CreateTaskPayload) => post<TaskResponse>('/tasks', { json: payload }),
    update: (id: string, payload: UpdateTaskPayload) =>
      patch<TaskResponse>(`/tasks/${id}`, { json: payload }),
    archive: (id: string, archived: boolean) =>
      patch<{ id: string; archived: boolean }>(`/tasks/${id}/archive`, {
        json: { archived },
      }),
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
  hiveTags: {
    list: () => get<HiveTagResponse[]>('/hive-tags'),
    create: (payload: CreateHiveTagPayload) => post<HiveTagResponse>('/hive-tags', { json: payload }),
  },
  assignments: {
    list: (params?: {
      hiveId?: string;
      status?: AssignmentStatus;
      groupId?: string;
      availableNow?: boolean;
      page?: number;
      limit?: number;
    }) =>
      get<PaginatedResponse<AssignmentResponse>>('/assignments', { query: params }).then(
        attachPaginationMetadata,
      ),
    create: (payload: CreateAssignmentPayload) => post<AssignmentResponse>('/assignments', { json: payload }),
    update: (id: string, payload: UpdateAssignmentPayload) =>
      patch<AssignmentResponse>(`/assignments/${id}`, { json: payload }),
    details: (id: string, params?: { userId?: string }) =>
      get<AssignmentDetails>(`/assignments/${id}/details`, { query: params }),
    run: (id: string) => get<AssignmentDetails>(`/assignments/${id}/run`),
    preview: (id: string) =>
      get<AssignmentDetails & { isActive: boolean }>(`/assignments/${id}/preview`),
    reviewQueue: (params?: {
      status?: AssignmentReviewStatus | 'all';
      page?: number;
      limit?: number;
    }) =>
      get<AssignmentReviewQueueResponse>('/assignments/review-queue', {
        query: params,
      }),
    submitRating: (id: string, payload: SubmitAssignmentRatingPayload) =>
      patch<AssignmentResponse>(`/assignments/${id}/rating`, { json: payload }),
    rate: (id: string, payload: SubmitAssignmentRatingPayload) =>
      post<AssignmentResponse>(`/assignments/${id}/rate`, { json: payload }),
    review: (id: string, payload: SubmitAssignmentReviewPayload) =>
      patch<AssignmentResponse>(`/assignments/${id}/review`, { json: payload }),
    bulkFromTemplate: (payload: BulkAssignmentsFromTemplatePayload) =>
      post<BulkAssignmentsFromTemplateResponse>('/assignments/bulk-from-template', { json: payload }),
  },
  profile: {
    update: (payload: UpdateProfilePayload) => patch<ProfileResponse>('/profile', { json: payload }),
    changePassword: (payload: ChangePasswordPayload) =>
      patch<{ success: boolean }>('/profile/password', { json: payload }),
    uploadAvatar: (formData: FormData) =>
      post<{ avatarUrl: string }>('/profile/avatar', { body: formData }),
  },
  groups: {
    list: (params?: { page?: number; limit?: number }) =>
      get<PaginatedResponse<GroupResponse>>('/groups', { query: params }).then(
        attachPaginationMetadata,
      ),
    get: (id: string) => get<GroupResponse>(`/groups/${id}`),
    create: (payload: CreateGroupPayload) => post<GroupResponse>('/groups', { json: payload }),
    update: (id: string, payload: UpdateGroupPayload) =>
      patch<GroupResponse>(`/groups/${id}`, { json: payload }),
    remove: (id: string) => del<void>(`/groups/${id}`),
    members: {
      list: (groupId: string, params?: { page?: number; limit?: number }) =>
        get<PaginatedResponse<GroupMemberResponse>>(`/groups/${groupId}/members`, {
          query: params,
        }).then(attachPaginationMetadata),
      add: (groupId: string, payload: AddGroupMemberPayload) =>
        post<GroupMemberResponse>(`/groups/${groupId}/members`, { json: payload }),
      remove: (groupId: string, userId: string, hiveId?: string) =>
        del<void>(`/groups/${groupId}/members/${userId}`, {
          query: hiveId ? { hiveId } : undefined,
        }),
    },
  },
  reports: {
    assignments: (params: { groupId: string; taskId?: string }) =>
      get<AssignmentReportRow[]>('/reports/assignments', { query: params }),
    assignmentAnalytics: (params?: {
      dateFrom?: string;
      dateTo?: string;
      taskId?: string;
      status?: AssignmentAnalyticsStatus;
      groupId?: string;
      page?: number;
      limit?: number;
    }) =>
      get<AssignmentAnalyticsResponse>('/reports/assignments/analytics', {
        query: params,
      }),
  },
  progress: {
    completeStep: (payload: CompleteStepPayload) =>
      post<StepProgressToggleResponse>('/progress/step-complete', { json: payload }),
    update: (id: string, payload: UpdateProgressPayload) =>
      patch<StepProgressResponse>(`/progress/${id}`, { json: payload }),
    listForAssignment: (assignmentId: string, params?: { userId?: string }) =>
      get<StepProgressResponse[]>(`/assignments/${assignmentId}/progress/list`, { query: params }),
    assignmentCompletion: (assignmentId: string, params?: { userId?: string }) =>
      get<number>(`/assignments/${assignmentId}/progress`, { query: params }),
    remove: (id: string) => del<void>(`/progress/${id}`),
  },
  users: {
    list: (params?: { page?: number; limit?: number; q?: string }) => {
      const query = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        q: params?.q ?? '',
      };

      return get<PaginatedResponse<AdminUserResponse>>('/users', { query }).then(
        attachPaginationMetadata,
      );
    },
    get: (id: string) => get<AdminUserResponse>(`/users/${id}`),
    create: (payload: CreateUserPayload) => post<AdminUserResponse>('/users', { json: payload }),
    update: (id: string, payload: UpdateUserPayload) =>
      patch<AdminUserResponse>(`/users/${id}`, { json: payload }),
    updateRole: (id: string, payload: UpdateUserRolePayload) =>
      patch<AdminUserResponse>(`/users/${id}/role`, { json: payload }),
    remove: (id: string) => del<void>(`/users/${id}`),
  },
  store: {
    listProducts: () =>
      get<StoreProduct[]>('/store/products', { skipAuth: true }),
    getProduct: (slug: string) =>
      get<StoreProduct>(`/store/products/${slug}`, { skipAuth: true }),
    createOrder: (payload: CreateStoreOrderPayload) =>
      post<StoreOrderResponse>('/store/orders', { json: payload }),
    myOrders: () => get<StoreMyOrder[]>('/store/my-orders'),
  },
  admin: {
    store: {
      products: {
        list: (params?: { page?: number; limit?: number; q?: string; isActive?: boolean }) =>
          get<PaginatedResponse<StoreProduct>>('/admin/store/products', { query: params }),
        create: (payload: AdminStoreProductPayload) =>
          post<StoreProduct>('/admin/store/products', { json: payload }),
        update: (id: string, payload: Partial<AdminStoreProductPayload>) =>
          patch<StoreProduct>(`/admin/store/products/${id}`, { json: payload }),
        disable: (id: string) => del<{ success: boolean }>(`/admin/store/products/${id}`),
      },
      orders: {
        list: (params?: { page?: number; limit?: number }) =>
          get<PaginatedResponse<StoreOrderListItem>>('/admin/store/orders', { query: params }),
        get: (id: string) => get<StoreOrderResponse>(`/admin/store/orders/${id}`),
        updateStatus: (id: string, payload: { status: StoreOrderStatus }) =>
          patch<StoreOrderListItem>(`/admin/store/orders/${id}/status`, { json: payload }),
      },
    },
    email: {
      sendTest: (payload: SendTestEmailPayload) =>
        post<{ success: true }>('/admin/email/test', { json: payload }),
    },
  },
};

export default api;
