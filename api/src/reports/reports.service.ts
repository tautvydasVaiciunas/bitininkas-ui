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
import { UserRole } from '../users/user.entity';
import {
  AssignmentAnalyticsQueryDto,
  AssignmentAnalyticsStatus,
} from './dto/assignment-analytics-query.dto';

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

@Injectable()
export class ReportsService {
  constructor(
    private readonly groupsService: GroupsService,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(GroupMember)
    private readonly membersRepository: Repository<GroupMember>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  private ensureManager(role: UserRole) {
    if (![UserRole.MANAGER, UserRole.ADMIN].includes(role)) {
      throw new ForbiddenException('Requires manager or admin role');
    }
  }

  async groupAssignmentProgress(
    groupId: string | undefined,
    taskId: string | undefined,
    actor: { role: UserRole },
  ): Promise<AssignmentReportRow[]> {
    this.ensureManager(actor.role);

    if (!groupId) {
      throw new BadRequestException('groupId query param is required');
    }

    const group = await this.groupsService.findOne(groupId);
    const memberIds = (group.members ?? []).map((member) => member.userId);

    if (memberIds.length === 0) {
      return [];
    }

    if (taskId) {
      const taskExists = await this.tasksRepository.exist({ where: { id: taskId } });
      if (!taskExists) {
        return group.members.map((member) => ({
          userId: member.userId,
          userName: member.user?.name || member.user?.email || 'Nežinomas vartotojas',
          assignmentId: null,
          status: null,
          completedSteps: 0,
          totalSteps: 0,
          overdue: false,
          dueDate: null,
        }));
      }
    }

    const qb = this.membersRepository
      .createQueryBuilder('membership')
      .innerJoin('membership.user', 'memberUser')
      .leftJoin(Hive, 'hive', 'hive.ownerUserId = membership.userId AND hive.deletedAt IS NULL')
      .leftJoin(
        Assignment,
        'assignment',
        `assignment.hiveId = hive.id${taskId ? ' AND assignment.taskId = :taskId' : ''}`,
      )
      .leftJoin('assignment.progress', 'progress')
      .leftJoin('assignment.task', 'task')
      .leftJoin('task.steps', 'taskStep')
      .where('membership.groupId = :groupId', { groupId })
      .select('memberUser.id', 'userId')
      .addSelect('memberUser.name', 'userName')
      .addSelect('memberUser.email', 'userEmail')
      .addSelect('assignment.id', 'assignmentId')
      .addSelect('assignment.status', 'status')
      .addSelect('assignment.dueDate', 'dueDate')
      .addSelect('COUNT(DISTINCT progress.id)', 'completedSteps')
      .addSelect('COUNT(DISTINCT taskStep.id)', 'totalSteps')
      .addSelect(
        `CASE WHEN assignment.id IS NOT NULL AND assignment.status != :doneStatus AND assignment.dueDate < CURRENT_DATE THEN true ELSE false END`,
        'overdue',
      )
      .groupBy('membership.id')
      .addGroupBy('memberUser.id')
      .addGroupBy('memberUser.name')
      .addGroupBy('memberUser.email')
      .addGroupBy('assignment.id')
      .addGroupBy('assignment.status')
      .addGroupBy('assignment.dueDate')
      .orderBy('memberUser.name', 'ASC')
      .addOrderBy('memberUser.email', 'ASC')
      .addOrderBy('assignment.dueDate', 'ASC')
      .setParameter('doneStatus', AssignmentStatus.DONE);

    if (taskId) {
      qb.setParameter('taskId', taskId);
    }

    const rawRows = await qb.getRawMany();

    const mapped = rawRows.map<AssignmentReportRow>((row) => {
      const assignmentId = row.assignmentId ?? row.assignmentid ?? null;
      const completedSteps = Number(row.completedSteps ?? row.completedsteps ?? 0);
      const totalSteps = Number(row.totalSteps ?? row.totalsteps ?? 0);
      const overdueRaw = row.overdue;
      const userName = (row.userName ?? row.username ?? '').trim();
      const userEmail = (row.userEmail ?? row.useremail ?? '').trim();

      return {
        userId: row.userId ?? row.userid,
        userName: userName.length > 0 ? userName : userEmail || 'Nežinomas vartotojas',
        assignmentId,
        status: assignmentId ? ((row.status as AssignmentStatus) ?? null) : null,
        completedSteps,
        totalSteps,
        overdue: assignmentId
          ? overdueRaw === true || overdueRaw === 'true' || overdueRaw === 't'
          : false,
        dueDate: assignmentId ? row.dueDate ?? row.duedate ?? null : null,
      };
    });

    const seen = new Set(mapped.map((row) => row.userId));

    for (const member of group.members ?? []) {
      if (!seen.has(member.userId)) {
        mapped.push({
          userId: member.userId,
          userName: member.user?.name || member.user?.email || 'Nežinomas vartotojas',
          assignmentId: null,
          status: null,
          completedSteps: 0,
          totalSteps: 0,
          overdue: false,
          dueDate: null,
        });
      }
    }

    return mapped.sort((a, b) => a.userName.localeCompare(b.userName));
  }

  async assignmentAnalytics(
    filters: AssignmentAnalyticsQueryDto,
    actor: { role: UserRole },
  ): Promise<AssignmentAnalyticsResponse> {
    this.ensureManager(actor.role);

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 20);

    const dataQuery = this.createAnalyticsBaseQuery(filters)
      .orderBy('assignment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [assignments, countResult, summaryResult] = await Promise.all([
      dataQuery.getMany(),
      this.buildAnalyticsCountQuery(filters).getRawOne<{ total: string | number }>(),
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

    const rows = assignments.map((assignment) => this.mapAssignmentToAnalyticsRow(assignment));

    return {
      summary,
      data: rows,
      total,
      page,
      limit,
    };
  }

  private mapAssignmentToAnalyticsRow(assignment: Assignment): AssignmentAnalyticsRow {
    const hiveLabel = assignment.hive?.label ?? '—';
    const user =
      assignment.hive?.owner?.name?.trim() ||
      assignment.hive?.owner?.email ||
      'Nežinomas vartotojas';
    const overdue =
      assignment.status !== AssignmentStatus.DONE &&
      Boolean(assignment.dueDate && new Date(assignment.dueDate) < new Date());

    return {
      assignmentId: assignment.id,
      taskId: assignment.taskId,
      taskTitle: assignment.task?.title ?? 'Užduotis',
      hiveId: assignment.hiveId ?? null,
      hiveLabel,
      userId: assignment.hive?.ownerUserId ?? null,
      userName: user,
      status: assignment.status,
      overdue,
      rating: assignment.rating ?? null,
      ratingComment: assignment.ratingComment ?? null,
      completedAt: assignment.completedAt ? assignment.completedAt.toISOString() : null,
      dueDate: assignment.dueDate ?? null,
      startDate: assignment.startDate ?? null,
    };
  }

  private createAnalyticsBaseQuery(filters: AssignmentAnalyticsQueryDto): SelectQueryBuilder<Assignment> {
    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.task', 'task')
      .leftJoinAndSelect('assignment.hive', 'hive');

    qb.leftJoin('hive.owner', 'owner');
    this.applyAnalyticsFilters(qb, filters);
    return qb;
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

    if (status === 'active') {
      qb.andWhere('assignment.status != :doneStatus', { doneStatus: AssignmentStatus.DONE });
    } else if (status === 'completed') {
      qb.andWhere('assignment.status = :doneStatus', { doneStatus: AssignmentStatus.DONE });
    } else if (status === 'overdue') {
      qb.andWhere('assignment.status != :doneStatus', { doneStatus: AssignmentStatus.DONE });
      qb.andWhere('assignment.due_date IS NOT NULL AND assignment.due_date < CURRENT_DATE');
    }
  }

  private buildAnalyticsCountQuery(filters: AssignmentAnalyticsQueryDto) {
    return this.createAnalyticsBaseQuery(filters).select('COUNT(assignment.id)', 'total');
  }

  private buildAnalyticsSummaryQuery(filters: AssignmentAnalyticsQueryDto) {
    return this.createAnalyticsBaseQuery(filters).select([
      'COUNT(assignment.id) AS total',
      `SUM(CASE WHEN assignment.status = :doneStatus THEN 1 ELSE 0 END) AS completed`,
      'AVG(assignment.rating) AS "avgRating"',
      'COUNT(DISTINCT hive.owner_user_id) AS "uniqueUsers"',
      `COUNT(DISTINCT CASE WHEN assignment.status = :doneStatus THEN hive.owner_user_id ELSE NULL END) AS "completedUsers"`,
    ]);
  }
}
