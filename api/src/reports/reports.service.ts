import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupsService } from '../groups/groups.service';
import { GroupMember } from '../groups/group-member.entity';
import { Assignment, AssignmentStatus } from '../assignments/assignment.entity';
import { Hive } from '../hives/hive.entity';
import { Task } from '../tasks/task.entity';
import { UserRole } from '../users/user.entity';

interface AssignmentReportRow {
  userId: string;
  userName: string;
  assignmentId: string | null;
  status: AssignmentStatus | null;
  completedSteps: number;
  totalSteps: number;
  overdue: boolean;
  dueDate: string | null;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly groupsService: GroupsService,
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
}
