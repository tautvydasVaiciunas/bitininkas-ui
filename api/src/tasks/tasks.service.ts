import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task, TaskFrequency } from './task.entity';
import { TaskStep } from './steps/task-step.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderStepsDto } from './steps/dto/reorder-steps.dto';
import { UserRole } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskStep)
    private readonly stepsRepository: Repository<TaskStep>,
    private readonly activityLog: ActivityLogService,
  ) {}

  private assertManager(role: UserRole) {
    if (![UserRole.MANAGER, UserRole.ADMIN].includes(role)) {
      throw new ForbiddenException('Requires manager or admin role');
    }
  }

  async create(dto: CreateTaskDto, user) {
    this.assertManager(user.role);
    const task = this.tasksRepository.create({
      ...dto,
      seasonMonths: dto.seasonMonths || [],
      createdByUserId: user.id,
    });
    const saved = await this.tasksRepository.save(task);
    await this.activityLog.log('task_created', user.id, 'task', saved.id);
    return saved;
  }

  async findAll(query: { category?: string; frequency?: TaskFrequency; seasonMonth?: number }) {
    const qb = this.tasksRepository.createQueryBuilder('task');
    if (query.category) {
      qb.andWhere('task.category = :category', { category: query.category });
    }
    if (query.frequency) {
      qb.andWhere('task.frequency = :frequency', { frequency: query.frequency });
    }
    if (query.seasonMonth) {
      qb.andWhere(':month = ANY(task.seasonMonths)', { month: query.seasonMonth });
    }
    return qb.getMany();
  }

  async findOne(id: string) {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, user) {
    this.assertManager(user.role);
    const task = await this.findOne(id);
    Object.assign(task, dto);
    const saved = await this.tasksRepository.save(task);
    await this.activityLog.log('task_updated', user.id, 'task', id);
    return saved;
  }

  async getSteps(taskId: string) {
    return this.stepsRepository.find({ where: { taskId }, order: { orderIndex: 'ASC' } });
  }

  async reorderSteps(taskId: string, dto: ReorderStepsDto, user) {
    this.assertManager(user.role);
    const stepIds = dto.steps.map((s) => s.stepId);
    const steps = await this.stepsRepository.find({ where: { id: In(stepIds), taskId } });
    if (steps.length !== dto.steps.length) {
      throw new NotFoundException('Some steps not found');
    }
    for (const order of dto.steps) {
      const step = steps.find((s) => s.id === order.stepId)!;
      step.orderIndex = order.orderIndex;
      await this.stepsRepository.save(step);
    }
    await this.activityLog.log('task_steps_reordered', user.id, 'task', taskId);
    return this.getSteps(taskId);
  }

  async createSteps(taskId: string, steps: Partial<TaskStep>[]) {
    const existingSteps = await this.getSteps(taskId);
    const maxIndex = existingSteps.reduce((max, step) => Math.max(max, step.orderIndex), 0);
    let index = maxIndex + 1;
    for (const step of steps) {
      const newStep = this.stepsRepository.create({
        ...step,
        taskId,
        orderIndex: step.orderIndex ?? index++,
      });
      await this.stepsRepository.save(newStep);
    }
    return this.getSteps(taskId);
  }

  async updateSteps(taskId: string, steps: Partial<TaskStep>[], user) {
    this.assertManager(user.role);
    await this.stepsRepository.delete({ taskId });
    let index = 1;
    for (const step of steps) {
      const newStep = this.stepsRepository.create({
        ...step,
        taskId,
        orderIndex: step.orderIndex ?? index++,
      });
      await this.stepsRepository.save(newStep);
    }
    await this.activityLog.log('task_steps_updated', user.id, 'task', taskId);
    return this.getSteps(taskId);
  }
}
