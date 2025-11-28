import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { GroupsService } from '../groups/groups.service';
import { GroupMember } from '../groups/group-member.entity';
import {
  Assignment,
  AssignmentStatus,
} from '../assignments/assignment.entity';
import { Hive } from '../hives/hive.entity';
import { Task } from '../tasks/task.entity';
import { AssignmentProgressStatus } from '../progress/assignment-progress.entity';
import { UserRole } from '../users/user.entity';
import {
  AssignmentAnalyticsQueryDto,
  AssignmentAnalyticsStatus,
} from './dto/assignment-analytics-query.dto';
import { GroupAssignmentQueryDto } from './dto/group-assignment-query.dto';

export interface AssignmentReportRow {
  assignmentId: string;
  taskId: string;
  taskTitle: string;
  hiveId: string | null;
  hiveLabel: string;
  userId: string | null;
  userName: string;
  status: AssignmentStatus;
  assignedAt: string | null;
  startDate: string | null;
  dueDate: string | null;
  lastActivity: string | null;
  completedSteps: number;
  totalSteps: number;
  overdue: boolean;
}

export interface AssignmentAnalyticsRow {
  taskId: string;
  taskTitle: string;
  assignedCount: number;
  completedCount: number;
  activeCount: number;
  waitingCount: number;
  overdueCount: number;
  avgRating: number | null;
  completedUsers: number;
  uniqueUsers: number;
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

@Injectable()
export class ReportsService {
  constructor(
    private readonly groupsService: GroupsService,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  private ensureManager(role: UserRole) {
    if (![UserRole.MANAGER, UserRole.ADMIN].includes(role)) {
      throw new ForbiddenException('Requires manager or admin role');
    }
  }

  async groupAssignmentProgress(
    query: GroupAssignmentQueryDto,
    actor: { role: UserRole },
  ): Promise<AssignmentReportRow[]> {
    this.ensureManager(actor.role);
    const group = await this.groupsService.findOne(query.groupId);
    if ((group.members ?? []).length === 0) {
      return [];
    }

    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.hive', 'hive')
      .innerJoin(
        GroupMember,
        'groupMember',
        'groupMember.user_id = hive.owner_user_id AND groupMember.group_id = :groupId',
        { groupId: query.groupId },
      )
      .leftJoin('hive.owner', 'owner')
      .leftJoin('assignment.task', 'task')
      .leftJoin('task.steps', 'taskStep')
      .leftJoin('assignment.progress', 'progress')
      .select('assignment.id', 'assignmentId')
      .addSelect('task.id', 'taskId')
      .addSelect('task.title', 'taskTitle')
      .addSelect('hive.id', 'hiveId')
      .addSelect('hive.label', 'hiveLabel')
      .addSelect('hive.owner_user_id', 'ownerUserId')
      .addSelect('COALESCE(owner.name, owner.email, \'Nežinomas vartotojas\')', 'userName')
      .addSelect('assignment.status', 'status')
      .addSelect('assignment.created_at', 'assignedAt')
      .addSelect('assignment.start_date', 'startDate')
      .addSelect('assignment.due_date', 'dueDate')
      .addSelect('MAX(progress.updated_at)', 'lastActivity')
      .addSelect('COUNT(DISTINCT taskStep.id)', 'totalSteps')
      .addSelect(
        `COUNT(DISTINCT CASE WHEN progress.status = :completedStatus THEN progress.task_step_id ELSE NULL END)`,
        'completedSteps',
      )
      .addSelect(
        `CASE WHEN assignment.status != :doneStatus AND assignment.due_date < CURRENT_DATE THEN true ELSE false END`,
        'overdue',
      )
      .groupBy('assignment.id')
      .addGroupBy('task.id')
      .addGroupBy('task.title')
      .addGroupBy('hive.id')
      .addGroupBy('hive.label')
      .addGroupBy('hive.owner_user_id')
      .addGroupBy('owner.name')
      .addGroupBy('owner.email')
      .addGroupBy('assignment.status')
      .addGroupBy('assignment.created_at')
      .addGroupBy('assignment.start_date')
      .addGroupBy('assignment.due_date')
      .setParameter('groupId', query.groupId)
      .setParameter('completedStatus', AssignmentProgressStatus.COMPLETED)
      .setParameter('doneStatus', AssignmentStatus.DONE)
      .orderBy('assignment.created_at', 'DESC');

    this.applyGroupAssignmentFilters(qb, query);

    const rows = await qb.getRawMany();
    const toIso = (value: string | Date | null | undefined) =>
      value ? new Date(value).toISOString() : null;

    return rows.map((row) => ({
      assignmentId: row.assignmentId,
      taskId: row.taskId,
      taskTitle: row.taskTitle ?? 'Užduotis',
      hiveId: row.hiveId ?? null,
      hiveLabel: row.hiveLabel ?? '—',
      userId: row.ownerUserId ?? null,
      userName: (row.userName ?? 'Nežinomas vartotojas').trim(),
      status: (row.status as AssignmentStatus) ?? AssignmentStatus.NOT_STARTED,
      assignedAt: toIso(row.assignedAt),
      startDate: toIso(row.startDate),
      dueDate: toIso(row.dueDate),
      lastActivity: toIso(row.lastActivity),
      completedSteps: Number(row.completedSteps ?? 0),
      totalSteps: Number(row.totalSteps ?? 0),
      overdue:
        row.overdue === true || row.overdue === 'true' || row.overdue === 't'
          ? true
          : false,
    }));
  }

  private applyGroupAssignmentFilters(
    qb: SelectQueryBuilder<Assignment>,
    query: GroupAssignmentQueryDto,
  ) {
    if (query.taskId) {
      qb.andWhere('assignment.task_id = :taskId', { taskId: query.taskId });
    }

    if (query.hiveId) {
      qb.andWhere('assignment.hive_id = :hiveId', { hiveId: query.hiveId });
    }

    if (query.userId) {
      qb.andWhere('hive.owner_user_id = :userId', { userId: query.userId });
    }

    if (query.dateFrom) {
      qb.andWhere('assignment.created_at::date >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere('assignment.created_at::date <= :dateTo', { dateTo: query.dateTo });
    }

    const status = query.status ?? 'all';
    const doneStatus = AssignmentStatus.DONE;

    if (status === 'waiting') {
      qb.andWhere('assignment.status = :notStarted', {
        notStarted: AssignmentStatus.NOT_STARTED,
      });
    } else if (status === 'active') {
      qb.andWhere('assignment.status = :inProgress', {
        inProgress: AssignmentStatus.IN_PROGRESS,
      });
    } else if (status === 'overdue') {
      qb.andWhere('assignment.status != :doneStatus', { doneStatus });
      qb.andWhere('assignment.due_date IS NOT NULL AND assignment.due_date < CURRENT_DATE');
    } else if (status === 'completed') {
      qb.andWhere('assignment.status = :doneStatus', { doneStatus });
    }
  }

  async assignmentAnalytics(
    filters: AssignmentAnalyticsQueryDto,
    actor: { role: UserRole },
  ): Promise<AssignmentAnalyticsResponse> {
    this.ensureManager(actor.role);

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 20);

    const dataQuery = this.createAnalyticsAggregationDataQuery(filters)
      .orderBy('task.title', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rowsRaw, countResult, summaryResult] = await Promise.all([
      dataQuery.getRawMany(),
      this.buildAnalyticsTaskCountQuery(filters).getRawOne<{ total: string | number }>(),
      this.buildAnalyticsSummaryQuery(filters).getRawOne<{
        completed: string | number;
        avgRating: string | null;
        uniqueUsers: string | number;
        completedUsers: string | number;
      }>(),
    ]);

    const total = Number(countResult?.total ?? 0);
    const summary: AssignmentAnalyticsSummary = {
      total,
      completed: Number(summaryResult?.completed ?? 0),
      avgRating: summaryResult?.avgRating ? Number(summaryResult.avgRating) : null,
      uniqueUsers: Number(summaryResult?.uniqueUsers ?? 0),
      completedUsers: Number(summaryResult?.completedUsers ?? 0),
    };

    const rows = rowsRaw.map((row) => ({
      taskId: row.taskId,
      taskTitle: row.taskTitle ?? 'Užduotis',
      assignedCount: Number(row.assignedCount ?? 0),
      completedCount: Number(row.completedCount ?? 0),
      activeCount: Number(row.activeCount ?? 0),
      waitingCount: Number(row.waitingCount ?? 0),
      overdueCount: Number(row.overdueCount ?? 0),
      avgRating: row.avgRating ? Number(row.avgRating) : null,
      completedUsers: Number(row.completedUsers ?? 0),
      uniqueUsers: Number(row.uniqueUsers ?? 0),
    }));

    return {
      summary,
      data: rows,
      total,
      page,
      limit,
    };
  }

  private createAnalyticsAggregationBaseQuery(filters: AssignmentAnalyticsQueryDto) {
    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.task', 'task')
      .innerJoin('assignment.hive', 'hive')
      .leftJoin('hive.owner', 'owner');

    qb.setParameter('doneStatus', AssignmentStatus.DONE);
    qb.setParameter('inProgressStatus', AssignmentStatus.IN_PROGRESS);
    qb.setParameter('notStartedStatus', AssignmentStatus.NOT_STARTED);
    qb.setParameter('completedStatus', AssignmentProgressStatus.COMPLETED);

    this.applyAnalyticsFilters(qb, filters);
    return qb;
  }

  private createAnalyticsAggregationDataQuery(filters: AssignmentAnalyticsQueryDto) {
    return this.createAnalyticsAggregationBaseQuery(filters)
      .select('task.id', 'taskId')
      .addSelect('task.title', 'taskTitle')
      .addSelect('COUNT(assignment.id)', 'assignedCount')
      .addSelect(
        'SUM(CASE WHEN assignment.status = :doneStatus THEN 1 ELSE 0 END)',
        'completedCount',
      )
      .addSelect(
        'SUM(CASE WHEN assignment.status = :inProgressStatus THEN 1 ELSE 0 END)',
        'activeCount',
      )
      .addSelect(
        'SUM(CASE WHEN assignment.status = :notStartedStatus THEN 1 ELSE 0 END)',
        'waitingCount',
      )
      .addSelect(
        'SUM(CASE WHEN assignment.status != :doneStatus AND assignment.due_date IS NOT NULL AND assignment.due_date < CURRENT_DATE THEN 1 ELSE 0 END)',
        'overdueCount',
      )
      .addSelect('AVG(assignment.rating)', 'avgRating')
      .addSelect('COUNT(DISTINCT hive.owner_user_id)', 'uniqueUsers')
      .addSelect(
        'COUNT(DISTINCT CASE WHEN assignment.status = :doneStatus THEN hive.owner_user_id ELSE NULL END)',
        'completedUsers',
      )
      .groupBy('task.id')
      .addGroupBy('task.title');
  }

  private buildAnalyticsTaskCountQuery(filters: AssignmentAnalyticsQueryDto) {
    return this.createAnalyticsAggregationBaseQuery(filters).select('COUNT(DISTINCT task.id)', 'total');
  }

  private applyAnalyticsFilters(qb: SelectQueryBuilder<Assignment>, filters: AssignmentAnalyticsQueryDto) {
    const status = (filters.status ?? 'all') as AssignmentAnalyticsStatus;
    qb.setParameter('doneStatus', AssignmentStatus.DONE);

    if (filters.taskId) {
      qb.andWhere('assignment.task_id = :taskId', { taskId: filters.taskId });
    }

    if (filters.dateFrom) {
      qb.andWhere('assignment.created_at::date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('assignment.created_at::date <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.groupId) {
      qb.innerJoin(
        GroupMember,
        'groupMemberFilter',
        'groupMemberFilter.user_id = hive.owner_user_id AND groupMemberFilter.group_id = :groupId',
        { groupId: filters.groupId },
      );
    }

    if (status === 'waiting') {
      qb.andWhere('assignment.status = :notStarted', { notStarted: AssignmentStatus.NOT_STARTED });
    } else if (status === 'active') {
      qb.andWhere('assignment.status = :inProgress', { inProgress: AssignmentStatus.IN_PROGRESS });
    } else if (status === 'completed') {
      qb.andWhere('assignment.status = :doneStatus', { doneStatus: AssignmentStatus.DONE });
    } else if (status === 'overdue') {
      qb.andWhere('assignment.status != :doneStatus', { doneStatus: AssignmentStatus.DONE });
      qb.andWhere('assignment.due_date IS NOT NULL AND assignment.due_date < CURRENT_DATE');
    }
  }

  private buildAnalyticsSummaryQuery(filters: AssignmentAnalyticsQueryDto) {
    return this.createAnalyticsAggregationBaseQuery(filters).select([
      'COUNT(assignment.id) AS total',
      `SUM(CASE WHEN assignment.status = :doneStatus THEN 1 ELSE 0 END) AS completed`,
      'AVG(assignment.rating) AS "avgRating"',
      'COUNT(DISTINCT hive.owner_user_id) AS "uniqueUsers"',
      `COUNT(DISTINCT CASE WHEN assignment.status = :doneStatus THEN hive.owner_user_id ELSE NULL END) AS "completedUsers"`,
    ]);
  }
}
