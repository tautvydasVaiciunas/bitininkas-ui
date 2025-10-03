import 'reflect-metadata';
import { dataSource } from '../typeorm.config';
import { User, UserRole } from '../users/user.entity';
import { Hive, HiveStatus } from '../hives/hive.entity';
import { Task, TaskFrequency } from '../tasks/task.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';
import { Assignment, AssignmentStatus } from '../assignments/assignment.entity';
import { StepProgress } from '../progress/step-progress.entity';
import { Notification } from '../notifications/notification.entity';
import * as bcrypt from 'bcrypt';

async function runSeed() {
  await dataSource.initialize();
  const userRepository = dataSource.getRepository(User);
  const hiveRepository = dataSource.getRepository(Hive);
  const taskRepository = dataSource.getRepository(Task);
  const stepRepository = dataSource.getRepository(TaskStep);
  const assignmentRepository = dataSource.getRepository(Assignment);
  const progressRepository = dataSource.getRepository(StepProgress);
  const notificationRepository = dataSource.getRepository(Notification);

  await progressRepository.delete({});
  await assignmentRepository.delete({});
  await stepRepository.delete({});
  await notificationRepository.delete({});
  await taskRepository.delete({});
  await hiveRepository.delete({});
  await userRepository.delete({});

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
    dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
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
      }),
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
  await dataSource.destroy();
}

runSeed().catch(async (error) => {
  console.error('Seeding failed', error);
  await dataSource.destroy();
  process.exit(1);
});
