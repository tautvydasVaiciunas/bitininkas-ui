import 'reflect-metadata';

import { AppDataSource } from '../ormdatasource';
import { User, UserRole } from '../users/user.entity';
import { Hive, HiveStatus } from '../hives/hive.entity';
import { Task, TaskFrequency } from '../tasks/task.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';
import { Tag } from '../tasks/tags/tag.entity';
import { Template } from '../templates/template.entity';
import { TemplateStep } from '../templates/template-step.entity';
import { Assignment, AssignmentStatus } from '../assignments/assignment.entity';
import { StepProgress } from '../progress/step-progress.entity';
import { Notification } from '../notifications/notification.entity';
import * as bcrypt from 'bcryptjs';

async function runSeed(): Promise<void> {
  const dataSource = AppDataSource;

  try {
    await dataSource.initialize();

    const userRepository = dataSource.getRepository(User);
    const hiveRepository = dataSource.getRepository(Hive);
    const taskRepository = dataSource.getRepository(Task);
    const stepRepository = dataSource.getRepository(TaskStep);
    const tagRepository = dataSource.getRepository(Tag);
    const assignmentRepository = dataSource.getRepository(Assignment);
    const progressRepository = dataSource.getRepository(StepProgress);
    const notificationRepository = dataSource.getRepository(Notification);
    const templateRepository = dataSource.getRepository(Template);
    const templateStepRepository = dataSource.getRepository(TemplateStep);

    // --- FK-safe wipe: one TRUNCATE ... CASCADE over all involved tables ---
    const repos = [
      progressRepository,   // step_progress
      assignmentRepository, // assignments
      templateStepRepository, // template_steps
      templateRepository,   // templates
      stepRepository,       // task_steps (ar faktinis tavo pavadinimas)
      tagRepository,        // tags
      notificationRepository,
      taskRepository,
      hiveRepository,
      userRepository,
    ];

    const tableNames = repos
      .map((r) => `"${r.metadata.tableName}"`)
      .join(', ');

    await dataSource.query(
      `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`
    );
    // --- end wipe ---

    const passwordHash = await bcrypt.hash('password', 10);

    const admin = userRepository.create({
      email: 'admin@example.com',
      passwordHash,
      role: UserRole.ADMIN,
      name: 'Admin User',
    });

    const manager = userRepository.create({
      email: 'manager@example.com',
      passwordHash,
      role: UserRole.MANAGER,
      name: 'Manager User',
    });

    const user = userRepository.create({
      email: 'jonas@example.com',
      passwordHash,
      role: UserRole.USER,
      name: 'Jonas',
    });

    await userRepository.save([admin, manager, user]);

    const hive1 = hiveRepository.create({
      label: 'Hive Alpha',
      ownerUserId: user.id,
      status: HiveStatus.ACTIVE,
    });

    const hive2 = hiveRepository.create({
      label: 'Hive Beta',
      ownerUserId: user.id,
      status: HiveStatus.PAUSED,
    });

    const hive3 = hiveRepository.create({
      label: 'Hive Gamma',
      ownerUserId: user.id,
      status: HiveStatus.ACTIVE,
    });

    await hiveRepository.save([hive1, hive2, hive3]);

    await dataSource.query(
      `
        INSERT INTO "hive_members" ("hive_id", "user_id")
        VALUES ($1, $2), ($3, $4), ($5, $6)
        ON CONFLICT DO NOTHING
      `,
      [hive1.id, user.id, hive2.id, user.id, hive3.id, user.id],
    );

    const task1 = taskRepository.create({
      title: 'Spring Inspection',
      description: 'Inspect hives after winter',
      category: 'inspection',
      seasonMonths: [3, 4],
      frequency: TaskFrequency.ONCE,
      defaultDueDays: 7,
      createdByUserId: manager.id,
    });

    const task2 = taskRepository.create({
      title: 'Honey Harvest',
      description: 'Harvest honey from supers',
      category: 'harvest',
      seasonMonths: [7, 8],
      frequency: TaskFrequency.MONTHLY,
      defaultDueDays: 14,
      createdByUserId: manager.id,
    });

    await taskRepository.save([task1, task2]);

    const generalTag = tagRepository.create({ name: 'Bendri darbai' });
    const springTag = tagRepository.create({ name: 'Pavasaris' });
    await tagRepository.save([generalTag, springTag]);

    const stepsTask1 = [
      { title: 'Prepare tools', orderIndex: 1, taskId: task1.id },
      { title: 'Inspect brood frames', orderIndex: 2, taskId: task1.id },
      { title: 'Check food stores', orderIndex: 3, taskId: task1.id },
    ];

    const stepsTask2 = [
      { title: 'Add empty supers', orderIndex: 1, taskId: task2.id },
      { title: 'Collect full supers', orderIndex: 2, taskId: task2.id },
      { title: 'Extract honey', orderIndex: 3, taskId: task2.id },
      { title: 'Bottle honey', orderIndex: 4, taskId: task2.id },
    ];

    const savedSteps = await stepRepository.save([
      ...stepsTask1.map((step) => stepRepository.create(step)),
      ...stepsTask2.map((step) => stepRepository.create(step)),
    ]);

    const prepareToolsStep = savedSteps.find((step) => step.title === 'Prepare tools');
    const addEmptySupersStep = savedSteps.find((step) => step.title === 'Add empty supers');

    if (prepareToolsStep) {
      await dataSource
        .createQueryBuilder()
        .relation(TaskStep, 'tags')
        .of(prepareToolsStep.id)
        .add(generalTag.id);
    }

    if (addEmptySupersStep) {
      await dataSource
        .createQueryBuilder()
        .relation(TaskStep, 'tags')
        .of(addEmptySupersStep.id)
        .add(springTag.id);
    }

    const inspectionTemplate = templateRepository.create({
      name: 'Spring Inspection Template',
      steps: savedSteps
        .filter((step) => step.taskId === task1.id)
        .map((step, index) =>
          templateStepRepository.create({
            taskStepId: step.id,
            orderIndex: index + 1,
          }),
        ),
    });

    await templateRepository.save(inspectionTemplate);

    const assignment1 = assignmentRepository.create({
      hiveId: hive1.id,
      taskId: task1.id,
      dueDate: new Date().toISOString().slice(0, 10),
      status: AssignmentStatus.IN_PROGRESS,
      createdByUserId: manager.id,
    });

    const assignment2 = assignmentRepository.create({
      hiveId: hive2.id,
      taskId: task2.id,
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10),
      status: AssignmentStatus.NOT_STARTED,
      createdByUserId: manager.id,
    });

    await assignmentRepository.save([assignment1, assignment2]);

    const progressEntries = savedSteps
      .filter((step) => step.taskId === task1.id)
      .slice(0, 2)
      .map((step) =>
        progressRepository.create({
          assignmentId: assignment1.id,
          taskStepId: step.id,
          notes: 'Completed during inspection',
        })
      );

    await progressRepository.save(progressEntries);

    await notificationRepository.save([
      notificationRepository.create({
        userId: user.id,
        type: 'assignment_due',
        payload: { assignmentId: assignment1.id },
      }),
      notificationRepository.create({
        userId: manager.id,
        type: 'progress_update',
        payload: { assignmentId: assignment1.id },
      }),
    ]);

    console.log('Seed data inserted successfully');
  } catch (error) {
    console.error('Seeding failed', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void runSeed();
