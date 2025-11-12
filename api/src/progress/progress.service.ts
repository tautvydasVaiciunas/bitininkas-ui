import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssignmentProgress,
  AssignmentProgressStatus,
} from './assignment-progress.entity';
import { CompleteStepDto } from './dto/complete-step.dto';
import { Assignment, AssignmentStatus } from '../assignments/assignment.entity';
import { Task } from '../tasks/task.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';
import { UserRole } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { Hive } from '../hives/hive.entity';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { HiveEventsService } from '../hives/hive-events.service';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(AssignmentProgress)
    private readonly progressRepository: Repository<AssignmentProgress>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskStep)
    private readonly stepRepository: Repository<TaskStep>,
    @InjectRepository(Hive)
    private readonly hiveRepository: Repository<Hive>,
    private readonly activityLog: ActivityLogService,
    private readonly hiveEvents: HiveEventsService,
  ) {}

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private async ensureAssignmentAccess(assignmentId: string, user) {
    const assignment = await this.assignmentsRepository.findOne({ where: { id: assignmentId } });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (user.role === UserRole.USER) {
      const hive = await this.hiveRepository.findOne({
        where: { id: assignment.hiveId },
        relations: { members: true },
      });

      if (!hive) {
        throw new NotFoundException('Hive not found');
      }

      const isOwner = hive.ownerUserId === user.id;
      const isMember = hive.members?.some((member) => member.id === user.id) ?? false;

      if (!isOwner && !isMember) {
        throw new ForbiddenException('Access denied');
      }
    }

    return assignment;
  }

  private async getAssignmentParticipantIds(assignment: Assignment) {
    const hive = await this.hiveRepository.findOne({
      where: { id: assignment.hiveId },
      relations: { members: true },
    });

    if (!hive) {
      throw new NotFoundException('Hive not found');
    }

    const memberIds = hive.members?.map((member) => member.id) ?? [];
    return Array.from(new Set([hive.ownerUserId, ...memberIds]));
  }

  private async resolveTargetUserId(
    assignment: Assignment,
    user,
    requestedUserId?: string,
    participantIds?: string[],
  ) {
    if (user.role === UserRole.USER) {
      return user.id;
    }

    if (!requestedUserId) {
      return user.id;
    }

    const participants = participantIds ?? (await this.getAssignmentParticipantIds(assignment));

    if (!participants.includes(requestedUserId)) {
      throw new ForbiddenException('User not part of assignment');
    }

    return requestedUserId;
  }

  private async calculateAssignmentCompletionPercentage(
    assignment: Assignment,
    participantIds?: string[],
  ) {
    const steps = await this.stepRepository.find({ where: { taskId: assignment.taskId } });

    if (!steps.length) {
      return 0;
    }

    const participants = participantIds ?? (await this.getAssignmentParticipantIds(assignment));

    if (!participants.length) {
      return 0;
    }

    const allProgress = await this.progressRepository.find({ where: { assignmentId: assignment.id } });

    const completionFractions = participants.map((participantId) => {
      const completed = allProgress.filter(
        (entry) =>
          entry.userId === participantId &&
          entry.status === AssignmentProgressStatus.COMPLETED,
      ).length;

      return completed / steps.length;
    });

    const average =
      completionFractions.reduce((sum, value) => sum + value, 0) /
      Math.max(completionFractions.length, 1);

    return Math.round(average * 100);
  }

  private async logAssignmentCompletedEvent(assignment: Assignment, userId: string) {
    const taskTitle = await this.getTaskTitle(assignment.taskId);
    await this.hiveEvents.logTaskCompleted(
      assignment.hiveId,
      assignment.id,
      assignment.taskId,
      taskTitle,
      userId,
    );
  }

  private async getTaskTitle(taskId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      select: { title: true },
    });

    return task?.title ?? 'Užduotis';
  }

  async completeStep(dto: CompleteStepDto, user) {
    const assignment = await this.ensureAssignmentAccess(dto.assignmentId, user);
    const step = await this.stepRepository.findOne({ where: { id: dto.taskStepId } });

    if (!step) {
      throw new NotFoundException('Task step not found');
    }

    if (step.taskId !== assignment.taskId) {
      throw new ForbiddenException('Step does not belong to assignment task');
    }

    const participantIds = await this.getAssignmentParticipantIds(assignment);
    const targetUserId = await this.resolveTargetUserId(
      assignment,
      user,
      dto.userId,
      participantIds,
    );

    if (!participantIds.includes(targetUserId)) {
      throw new ForbiddenException('User not part of assignment');
    }

    let progress = await this.progressRepository.findOne({
      where: {
        assignmentId: dto.assignmentId,
        taskStepId: dto.taskStepId,
        userId: targetUserId,
      },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        assignmentId: dto.assignmentId,
        taskStepId: dto.taskStepId,
        userId: targetUserId,
        status: AssignmentProgressStatus.PENDING,
        completedAt: null,
      });
    }

    const isCurrentlyCompleted = progress.status === AssignmentProgressStatus.COMPLETED;

    if (isCurrentlyCompleted) {
      progress.status = AssignmentProgressStatus.PENDING;
      progress.completedAt = null;
      progress.notes = null;
      progress.evidenceUrl = null;
      const saved = await this.progressRepository.save(progress);
      await this.activityLog.log('step_uncompleted', user.id, 'assignment', assignment.id);

      return {
        status: saved.status,
        taskStepId: saved.taskStepId,
        progress: saved,
      };
    }

    const completionBefore = await this.calculateAssignmentCompletionPercentage(
      assignment,
      participantIds,
    );

    progress.status = AssignmentProgressStatus.COMPLETED;
    progress.completedAt = new Date();
    progress.notes = this.normalizeNullableString(dto.notes);
    progress.evidenceUrl = this.normalizeNullableString(dto.evidenceUrl);

    const saved = await this.progressRepository.save(progress);
    await this.activityLog.log('step_completed', user.id, 'assignment', assignment.id);

    const completionAfter = await this.calculateAssignmentCompletionPercentage(
      assignment,
      participantIds,
    );

    if (
      assignment.status !== AssignmentStatus.DONE &&
      completionBefore < 100 &&
      completionAfter === 100
    ) {
      await this.logAssignmentCompletedEvent(assignment, user.id);
    }

    return { status: saved.status, taskStepId: saved.taskStepId, progress: saved };
  }

  async update(id: string, dto: UpdateProgressDto, user) {
    const progress = await this.progressRepository.findOne({ where: { id } });

    if (!progress) {
      throw new NotFoundException('Progress not found');
    }

    await this.ensureAssignmentAccess(progress.assignmentId, user);

    if (user.role === UserRole.USER && progress.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    if (dto.notes !== undefined) {
      progress.notes = this.normalizeNullableString(dto.notes);
    }

    if (dto.evidenceUrl !== undefined) {
      progress.evidenceUrl = this.normalizeNullableString(dto.evidenceUrl);
    }

    return this.progressRepository.save(progress);
  }

  async listForAssignment(assignmentId: string, user, requestedUserId?: string) {
    const assignment = await this.ensureAssignmentAccess(assignmentId, user);

    if (user.role === UserRole.USER) {
      return this.progressRepository.find({
        where: { assignmentId, userId: user.id },
        order: { taskStepId: 'ASC', userId: 'ASC', createdAt: 'ASC' },
      });
    }

    if (requestedUserId) {
      const participantIds = await this.getAssignmentParticipantIds(assignment);

      if (!participantIds.includes(requestedUserId)) {
        throw new ForbiddenException('User not part of assignment');
      }

      return this.progressRepository.find({
        where: { assignmentId, userId: requestedUserId },
        order: { taskStepId: 'ASC', userId: 'ASC', createdAt: 'ASC' },
      });
    }

    return this.progressRepository.find({
      where: { assignmentId },
      order: { taskStepId: 'ASC', userId: 'ASC', createdAt: 'ASC' },
    });
  }

  async remove(id: string, user) {
    const progress = await this.progressRepository.findOne({ where: { id } });

    if (!progress) {
      throw new NotFoundException('Progress not found');
    }

    if (![UserRole.MANAGER, UserRole.ADMIN].includes(user.role)) {
      await this.ensureAssignmentAccess(progress.assignmentId, user);
    }

    await this.progressRepository.delete(id);
    await this.activityLog.log('step_progress_deleted', user.id, 'progress', id);
    return { success: true };
  }

  async assignmentCompletion(assignmentId: string, user, requestedUserId?: string) {
    const assignment = await this.ensureAssignmentAccess(assignmentId, user);
    const steps = await this.stepRepository.find({ where: { taskId: assignment.taskId } });

    if (!steps.length) {
      return 0;
    }

    if (user.role === UserRole.USER) {
      const progress = await this.progressRepository.find({
        where: {
          assignmentId,
          userId: user.id,
          status: AssignmentProgressStatus.COMPLETED,
        },
      });

      return Math.round((progress.length / steps.length) * 100);
    }

    if (requestedUserId) {
      const participantIds = await this.getAssignmentParticipantIds(assignment);

      if (!participantIds.includes(requestedUserId)) {
        throw new ForbiddenException('User not part of assignment');
      }

      const progress = await this.progressRepository.find({
        where: {
          assignmentId,
          userId: requestedUserId,
          status: AssignmentProgressStatus.COMPLETED,
        },
      });

      return Math.round((progress.length / steps.length) * 100);
    }

    const participantIds = await this.getAssignmentParticipantIds(assignment);

    if (!participantIds.length) {
      return 0;
    }

    const allProgress = await this.progressRepository.find({ where: { assignmentId } });

    const completions = participantIds.map((participantId) => {
      const completed = allProgress.filter(
        (entry) =>
          entry.userId === participantId &&
          entry.status === AssignmentProgressStatus.COMPLETED,
      ).length;

      return completed / steps.length;
    });

    const average =
      completions.reduce((sum, value) => sum + value, 0) / Math.max(completions.length, 1);

    return Math.round(average * 100);
  }
}
