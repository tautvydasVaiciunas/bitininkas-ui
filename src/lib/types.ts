import type {
  AssignmentDetails as ApiAssignmentDetails,
  AssignmentResponse as ApiAssignmentResponse,
  AssignmentStatus as ApiAssignmentStatus,
  AuthenticatedUser as ApiAuthenticatedUser,
  CreateAssignmentPayload,
  CreateHivePayload,
  CreateTaskPayload,
  CreateTaskStepPayload,
  HiveMemberResponse as ApiHiveMemberResponse,
  HiveResponse as ApiHiveResponse,
  HiveStatus as ApiHiveStatus,
  HiveSummary as ApiHiveSummary,
  LoginPayload,
  NotificationResponse as ApiNotificationResponse,
  RegisterPayload,
  StepProgressResponse as ApiStepProgressResponse,
  TaskFrequency as ApiTaskFrequency,
  TaskResponse as ApiTaskResponse,
  TaskStepResponse as ApiTaskStepResponse,
  TaskWithStepsResponse as ApiTaskWithStepsResponse,
  UpdateAssignmentPayload,
  UpdateHivePayload,
  UpdateTaskPayload,
  UpdateTaskStepPayload,
  UpdateUserPayload,
  UpdateProgressPayload,
  UserRole as ApiUserRole,
} from './api';

export type {
  CreateAssignmentPayload,
  CreateHivePayload,
  CreateTaskPayload,
  CreateTaskStepPayload,
  LoginPayload,
  RegisterPayload,
  UpdateAssignmentPayload,
  UpdateHivePayload,
  UpdateTaskPayload,
  UpdateTaskStepPayload,
  UpdateUserPayload,
  UpdateProgressPayload,
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
export type StepProgress = ApiStepProgressResponse;
export type Notification = ApiNotificationResponse;
export type HiveSummary = ApiHiveSummary;
export type TaskFrequency = ApiTaskFrequency;
export type UserRole = ApiUserRole;

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
});

export const mapTaskFromApi = (task: ApiTaskResponse): Task => ({
  ...task,
  seasonMonths: Array.isArray(task.seasonMonths) ? [...task.seasonMonths] : [],
});

export const mapTaskWithStepsFromApi = (task: ApiTaskWithStepsResponse): TaskWithSteps => ({
  ...mapTaskFromApi(task),
  steps: task.steps.map(mapTaskStepFromApi),
});

export const mapAssignmentFromApi = (assignment: ApiAssignmentResponse): Assignment => ({
  ...assignment,
});

export const mapStepProgressFromApi = (progress: ApiStepProgressResponse): StepProgress => ({
  ...progress,
  notes: mapOptionalString(progress.notes),
  evidenceUrl: mapOptionalString(progress.evidenceUrl),
});

export const mapAssignmentDetailsFromApi = (details: ApiAssignmentDetails): AssignmentDetails => ({
  assignment: mapAssignmentFromApi(details.assignment),
  task: mapTaskWithStepsFromApi(details.task),
  progress: (details.progress ?? []).map(mapStepProgressFromApi),
  completion: details.completion ?? 0,
});

export const mapNotificationFromApi = (notification: ApiNotificationResponse): Notification => ({
  ...notification,
  title: mapOptionalString(notification.title),
  message: mapOptionalString(notification.message),
  scheduledAt: mapOptionalString(notification.scheduledAt),
  sentAt: mapOptionalString(notification.sentAt),
  readAt: mapOptionalString(notification.readAt),
});

export const mapUserFromApi = (user: ApiAuthenticatedUser): User => ({
  ...user,
});
