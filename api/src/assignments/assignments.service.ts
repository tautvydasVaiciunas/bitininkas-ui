import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Assignment, AssignmentStatus } from "./assignment.entity";
import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { UpdateAssignmentDto } from "./dto/update-assignment.dto";
import { Hive } from "../hives/hive.entity";
import { Task } from "../tasks/task.entity";
import { TaskStep } from "../tasks/steps/task-step.entity";
import { StepProgress } from "../progress/step-progress.entity";
import { UserRole } from "../users/user.entity";
import { ActivityLogService } from "../activity-log/activity-log.service";
@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(Hive) private readonly hiveRepository: Repository<Hive>,
    @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskStep)
    private readonly stepRepository: Repository<TaskStep>,
    @InjectRepository(StepProgress)
    private readonly progressRepository: Repository<StepProgress>,
    private readonly activityLog: ActivityLogService,
  ) {}
  private async getAccessibleHiveIds(userId: string) {
    const rows = await this.hiveRepository
      .createQueryBuilder('hive')
      .leftJoin('hive.members', 'member')
      .where('hive.ownerUserId = :userId OR member.id = :userId', { userId })
      .select('DISTINCT hive.id', 'id')
      .getRawMany();

    return rows.map((row) => row.id as string);
  }

  private async ensureUserCanAccessHive(hiveId: string, userId: string) {
    const accessible = await this.hiveRepository
      .createQueryBuilder('hive')
      .leftJoin('hive.members', 'member')
      .where('hive.id = :hiveId', { hiveId })
      .andWhere('hive.ownerUserId = :userId OR member.id = :userId', { userId })
      .getOne();

    return Boolean(accessible);
  }
  private assertManager(role: UserRole) {
    if (![UserRole.MANAGER, UserRole.ADMIN].includes(role)) {
      throw new ForbiddenException("Requires manager or admin role");
    }
  }
  async create(dto: CreateAssignmentDto, user) {
    this.assertManager(user.role);
    const hive = await this.hiveRepository.findOne({
      where: { id: dto.hiveId },
    });
    if (!hive) {
      throw new NotFoundException("Hive not found");
    }
    const task = await this.taskRepository.findOne({
      where: { id: dto.taskId },
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    const assignment = this.assignmentsRepository.create({
      ...dto,
      createdByUserId: user.id,
    });
    const saved = await this.assignmentsRepository.save(assignment);
    await this.activityLog.log(
      "assignment_created",
      user.id,
      "assignment",
      saved.id,
    );
    return saved;
  }
  async findAll(filter: { hiveId?: string }, user) {
    const where: any = {};
    if (filter.hiveId) {
      where.hiveId = filter.hiveId;
    }
    if (user.role === UserRole.USER) {
      const accessibleIds = await this.getAccessibleHiveIds(user.id);

      if (filter.hiveId) {
        if (!accessibleIds.includes(filter.hiveId)) {
          return [];
        }
      } else {
        if (!accessibleIds.length) {
          return [];
        }
        where.hiveId = In(accessibleIds);
      }
    }
    return this.assignmentsRepository.find({ where });
  }
  async findOne(id: string, user) {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }
    if (user.role === UserRole.USER) {
      const allowed = await this.ensureUserCanAccessHive(assignment.hiveId, user.id);
      if (!allowed) {
        throw new ForbiddenException("Access denied");
      }
    }
    return assignment;
  }
  async update(id: string, dto: UpdateAssignmentDto, user) {
    const assignment = await this.findOne(id, user);
    if (dto.status && !Object.values(AssignmentStatus).includes(dto.status)) {
      throw new ForbiddenException("Invalid status");
    }
    Object.assign(assignment, dto);
    const saved = await this.assignmentsRepository.save(assignment);
    await this.activityLog.log("assignment_updated", user.id, "assignment", id);
    return saved;
  }
  async getDetails(id: string, user) {
    const assignment = await this.findOne(id, user);
    const task = await this.taskRepository.findOne({
      where: { id: assignment.taskId },
      relations: ["steps"],
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    const progress = await this.progressRepository.find({
      where: { assignmentId: id },
    });
    const completedStepIds = new Set(progress.map((p) => p.taskStepId));
    const totalSteps = task?.steps?.length || 0;
    const completedSteps = totalSteps
      ? task.steps.filter((step) => completedStepIds.has(step.id)).length
      : 0;
    const percent =
      totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
    return { assignment, task, progress, completion: percent };
  }
  async calculateHiveSummary(hiveId: string, user) {
    const hive = await this.hiveRepository.findOne({ where: { id: hiveId } });
    if (!hive) {
      throw new NotFoundException("Hive not found");
    }
    if (user.role === UserRole.USER) {
      const allowed = await this.ensureUserCanAccessHive(hiveId, user.id);
      if (!allowed) {
        throw new ForbiddenException("Access denied");
      }
    }
    const assignments = await this.assignmentsRepository.find({
      where: { hiveId },
    });
    if (assignments.length === 0) {
      return { hiveId, assignmentsCount: 0, completion: 0 };
    }
    const assignmentIds = assignments.map((a) => a.id);
    const progress = await this.progressRepository.find({
      where: { assignmentId: In(assignmentIds) },
    });
    const completedStepIds = new Set(progress.map((p) => p.taskStepId));
    let totalSteps = 0;
    let completed = 0;
    for (const assignment of assignments) {
      const taskSteps = await this.stepRepository.find({
        where: { taskId: assignment.taskId },
      });
      totalSteps += taskSteps.length;
      completed += taskSteps.filter((step) =>
        completedStepIds.has(step.id),
      ).length;
    }
    const percent =
      totalSteps === 0 ? 0 : Math.round((completed / totalSteps) * 100);
    return {
      hiveId,
      assignmentsCount: assignments.length,
      completion: percent,
    };
  }
}
