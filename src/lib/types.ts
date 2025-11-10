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
  ReorderTemplateStepsPayload,
  TagResponse as ApiTagResponse,
  CreateGlobalTaskStepPayload,
  CreateNewsPayload,
  UpdateNewsPayload,
  NewsPostResponse as ApiNewsPostResponse,
  PaginatedNewsResponse as ApiPaginatedNewsResponse,
  PaginatedResponse as ApiPaginatedResponse,
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
  UpdateAssignmentPayload,
  UpdateGroupPayload,
  UpdateHivePayload,
  UpdateTaskPayload,
  UpdateTaskStepPayload,
  CreateTemplatePayload,
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
export type Template = Omit<ApiTemplateResponse, 'steps' | 'description'> & {
  description: string | null;
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
export type Paginated<T> = ApiPaginatedResponse<T>;

export interface PaginatedNews extends Paginated<NewsPost> {
  hasMore: boolean;
}

export interface User extends ApiAuthenticatedUser {
  phone?: string | null;
  address?: string | null;
  createdAt?: string | null;
  avatarUrl?: string | null;
}
