import type {
  AssignmentDetails as ApiAssignmentDetails,
  AssignmentResponse as ApiAssignmentResponse,
  AssignmentStatus as ApiAssignmentStatus,
  AuthenticatedUser as ApiAuthenticatedUser,
  BulkAssignmentsFromTemplatePayload,
  BulkAssignmentsFromTemplateResponse,
  AddGroupMemberPayload,
  CreateAssignmentPayload,
  CreateGroupPayload,
  CreateHivePayload,
  CreateTaskPayload,
  CreateTaskStepPayload,
  CreateTemplatePayload,
  GroupMemberResponse as ApiGroupMemberResponse,
  GroupResponse as ApiGroupResponse,
  HiveMemberResponse as ApiHiveMemberResponse,
  HiveResponse as ApiHiveResponse,
  HiveStatus as ApiHiveStatus,
  HiveSummary as ApiHiveSummary,
  LoginPayload,
  ProfileResponse as ApiProfileResponse,
  NotificationResponse as ApiNotificationResponse,
  NotificationType as ApiNotificationType,
  AssignmentReportRow as ApiAssignmentReportRow,
  RegisterPayload,
  ChangePasswordPayload,
  StepProgressResponse as ApiStepProgressResponse,
  StepProgressToggleResponse as ApiStepProgressToggleResponse,
  TaskFrequency as ApiTaskFrequency,
  TaskResponse as ApiTaskResponse,
  TaskStepResponse as ApiTaskStepResponse,
  TaskWithStepsResponse as ApiTaskWithStepsResponse,
  TemplateResponse as ApiTemplateResponse,
  TemplateStepResponse as ApiTemplateStepResponse,
  UpdateAssignmentPayload,
  UpdateGroupPayload,
  UpdateHivePayload,
  UpdateTaskPayload,
  UpdateTaskStepPayload,
  UpdateTemplatePayload,
  UpdateProfilePayload,
  UpdateUserPayload,
  UpdateUserRolePayload,
  UpdateProgressPayload,
  UserRole as ApiUserRole,
  TemplateStepWithOrderPayload,
  ReorderTemplateStepsPayload,
  TagResponse as ApiTagResponse,
  CreateGlobalTaskStepPayload,
  CreateNewsPayload,
  UpdateNewsPayload,
  NewsPostResponse as ApiNewsPostResponse,
  PaginatedNewsResponse as ApiPaginatedNewsResponse,
  NewsGroupResponse as ApiNewsGroupResponse,
} from './api';

export type {
  CreateAssignmentPayload,
  CreateHivePayload,
  CreateGroupPayload,
  CreateTaskPayload,
  CreateTaskStepPayload,
  TaskStepMediaType,
  AddGroupMemberPayload,
  LoginPayload,
  RegisterPayload,
  UpdateAssignmentPayload,
  UpdateGroupPayload,
  UpdateHivePayload,
  UpdateTaskPayload,
  UpdateTaskStepPayload,
  CreateTemplatePayload,
  TemplateStepWithOrderPayload,
  UpdateTemplatePayload,
  ReorderTemplateStepsPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,
  UpdateUserPayload,
  UpdateUserRolePayload,
  UpdateProgressPayload,
  BulkAssignmentsFromTemplatePayload,
  BulkAssignmentsFromTemplateResponse,
  CreateGlobalTaskStepPayload,
  CreateNewsPayload,
  UpdateNewsPayload,
} from './api';

export type AuthenticatedUser = ApiAuthenticatedUser;
export type Assignment = ApiAssignmentResponse;
export type AssignmentDetails = ApiAssignmentDetails;
export type AssignmentStatus = ApiAssignmentStatus;
export type HiveMember = ApiHiveMemberResponse;
export type Hive = Omit<ApiHiveResponse, 'members'> & { members: HiveMember[] };
export type HiveStatus = ApiHiveStatus;
export type Task = ApiTaskResponse;
export type TaskWithSteps = ApiTaskWithStepsResponse;
export type TaskStep = ApiTaskStepResponse;
export type Tag = ApiTagResponse;
export type TemplateStep = Omit<ApiTemplateStepResponse, 'taskStep'> & { taskStep: TaskStep };
export type Template = Omit<ApiTemplateResponse, 'steps' | 'comment'> & {
  comment: string | null;
  steps: TemplateStep[];
};
export type StepProgress = ApiStepProgressResponse;
export interface StepProgressToggleResult {
  status: ApiStepProgressToggleResponse['status'];
  taskStepId: string;
  progress: StepProgress;
}
export type Notification = ApiNotificationResponse;
export type NotificationType = ApiNotificationType;
export type HiveSummary = ApiHiveSummary;
export type TaskFrequency = ApiTaskFrequency;
export type UserRole = ApiUserRole;
export type GroupMember = ApiGroupMemberResponse;
export type Group = Omit<ApiGroupResponse, 'members'> & { members: GroupMember[] };
export type AssignmentReportItem = ApiAssignmentReportRow;
export type Profile = ApiProfileResponse;
export type NewsGroup = ApiNewsGroupResponse;
export type NewsPost = ApiNewsPostResponse;
export interface PaginatedNews {
  items: NewsPost[];
  page: number;
  limit: number;
  hasMore: boolean;
  total: number;
}

export interface User extends ApiAuthenticatedUser {
  phone?: string | null;
  address?: string | null;
  createdAt?: string | null;
}

const mapOptionalString = (value?: string | null) => (value === undefined || value === null ? null : value);

export const mapHiveFromApi = (hive: ApiHiveResponse): Hive => ({
  ...hive,
  location: hive.location ?? null,
  queenYear: hive.queenYear ?? null,
  members: Array.isArray(hive.members)
    ? hive.members.map((member) => ({
        ...member,
        name: mapOptionalString(member.name),
      }))
    : [],
});

export const mapTaskStepFromApi = (step: ApiTaskStepResponse): TaskStep => ({
  ...step,
  contentText: step.contentText ?? null,
  mediaUrl: step.mediaUrl ?? null,
  mediaType: step.mediaType ?? null,
  requireUserMedia: step.requireUserMedia ?? false,
  tags: Array.isArray(step.tags) ? step.tags.map((tag) => ({ ...tag })) : [],
});

export const mapTaskFromApi = (task: ApiTaskResponse): Task => ({
  ...task,
  seasonMonths: Array.isArray(task.seasonMonths) ? [...task.seasonMonths] : [],
});

export const mapTaskWithStepsFromApi = (task: ApiTaskWithStepsResponse): TaskWithSteps => ({
  ...mapTaskFromApi(task),
  steps: task.steps.map(mapTaskStepFromApi),
});

export const mapTemplateStepFromApi = (step: ApiTemplateStepResponse): TemplateStep => ({
  ...step,
  taskStep: mapTaskStepFromApi(step.taskStep),
});

export const mapTemplateFromApi = (template: ApiTemplateResponse): Template => ({
  ...template,
  comment: template.comment ?? null,
  steps: Array.isArray(template.steps) ? template.steps.map(mapTemplateStepFromApi) : [],
});

export const mapAssignmentFromApi = (assignment: ApiAssignmentResponse): Assignment => ({
  ...assignment,
  startDate: assignment.startDate ?? null,
});

export const mapStepProgressFromApi = (progress: ApiStepProgressResponse): StepProgress => ({
  ...progress,
  completedAt: mapOptionalString(progress.completedAt),
  notes: mapOptionalString(progress.notes),
  evidenceUrl: mapOptionalString(progress.evidenceUrl),
});

export const mapStepToggleResponseFromApi = (
  response: ApiStepProgressToggleResponse,
): StepProgressToggleResult => ({
  status: response.status,
  taskStepId: response.taskStepId,
  progress: mapStepProgressFromApi(response.progress),
});

export const mapAssignmentDetailsFromApi = (details: ApiAssignmentDetails): AssignmentDetails => ({
  assignment: mapAssignmentFromApi(details.assignment),
  task: mapTaskWithStepsFromApi(details.task),
  progress: (details.progress ?? []).map(mapStepProgressFromApi),
  completion: details.completion ?? 0,
});

export const mapNotificationFromApi = (notification: ApiNotificationResponse): Notification => ({
  ...notification,
  link: notification.link ?? null,
});

export const mapNewsPostFromApi = (post: ApiNewsPostResponse): NewsPost => ({
  ...post,
  imageUrl: post.imageUrl ?? null,
  groups: Array.isArray(post.groups)
    ? post.groups.map((group) => ({ id: group.id, name: group.name }))
    : [],
});

export const mapPaginatedNewsFromApi = (
  response: ApiPaginatedNewsResponse,
): PaginatedNews => ({
  items: response.items.map(mapNewsPostFromApi),
  page: response.page,
  limit: response.limit,
  hasMore: response.hasMore,
  total: response.total,
});

export const mapUserFromApi = (user: ApiAuthenticatedUser): User => ({
  ...user,
});

export const mapGroupMemberFromApi = (member: ApiGroupMemberResponse): GroupMember => ({
  ...member,
  role: mapOptionalString(member.role),
  user: member.user
    ? {
        ...member.user,
        name: mapOptionalString(member.user.name),
      }
    : undefined,
});

export const mapGroupFromApi = (group: ApiGroupResponse): Group => ({
  ...group,
  description: mapOptionalString(group.description),
  members: Array.isArray(group.members)
    ? group.members.map(mapGroupMemberFromApi)
    : [],
});

export const mapProfileFromApi = (profile: ApiProfileResponse): Profile => ({
  ...profile,
  name: mapOptionalString(profile.name),
  phone: mapOptionalString(profile.phone),
  address: mapOptionalString(profile.address),
});
