import {
  type AssignmentDetails as ApiAssignmentDetails,
  type AssignmentResponse as ApiAssignmentResponse,
  type AssignmentStatus as ApiAssignmentStatus,
  type AuthenticatedUser as ApiAuthenticatedUser,
  type GroupMemberResponse as ApiGroupMemberResponse,
  type GroupResponse as ApiGroupResponse,
  type HiveResponse as ApiHiveResponse,
  type NotificationResponse as ApiNotificationResponse,
  type NewsPostResponse as ApiNewsPostResponse,
  type PaginatedNewsResponse as ApiPaginatedNewsResponse,
  type ProfileResponse as ApiProfileResponse,
  type StepProgressResponse as ApiStepProgressResponse,
  type StepProgressToggleResponse as ApiStepProgressToggleResponse,
  type TaskResponse as ApiTaskResponse,
  type TaskStepResponse as ApiTaskStepResponse,
  type TaskWithStepsResponse as ApiTaskWithStepsResponse,
  type TemplateResponse as ApiTemplateResponse,
  type TemplateStepResponse as ApiTemplateStepResponse,
} from './api';
import {
  type Assignment,
  type AssignmentDetails,
  type Group,
  type GroupMember,
  type Hive,
  type NewsPost,
  type Notification,
  type PaginatedNews,
  type Profile,
  type StepProgress,
  type StepProgressToggleResult,
  type Task,
  type TaskStep,
  type TaskWithSteps,
  type Template,
  type TemplateStep,
  type User,
} from './types';
import { inferMediaType, resolveMediaUrl } from './media';

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

export const mapTaskStepFromApi = (step: ApiTaskStepResponse): TaskStep => {
  const resolvedMediaUrl = resolveMediaUrl(step.mediaUrl);
  const mediaKind = inferMediaType(step.mediaType ?? null, resolvedMediaUrl);

  return {
    ...step,
    contentText: step.contentText ?? null,
    mediaUrl: resolvedMediaUrl,
    mediaType: mediaKind,
    requireUserMedia: step.requireUserMedia ?? false,
    tags: Array.isArray(step.tags) ? step.tags.map((tag) => ({ ...tag })) : [],
  };
};

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
  description: template.description ?? null,
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
  imageUrl: resolveMediaUrl(post.imageUrl),
  groups: Array.isArray(post.groups)
    ? post.groups.map((group) => ({ id: group.id, name: group.name }))
    : [],
});

export const mapPaginatedNewsFromApi = (response: ApiPaginatedNewsResponse): PaginatedNews => ({
  data: response.data.map(mapNewsPostFromApi),
  page: response.page,
  limit: response.limit,
  hasMore: response.hasMore,
  total: response.total,
});

export const mapUserFromApi = (user: ApiAuthenticatedUser): User => ({
  ...user,
  avatarUrl: resolveMediaUrl(user.avatarUrl),
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
  hive: member.hive
    ? {
        ...member.hive,
        label: member.hive.label,
      }
    : member.hive === null
      ? null
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
  avatarUrl: resolveMediaUrl(profile.avatarUrl),
});
