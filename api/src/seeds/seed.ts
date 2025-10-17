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
import {
  AssignmentProgress,
  AssignmentProgressStatus,
} from '../progress/assignment-progress.entity';
import { Notification } from '../notifications/notification.entity';
import { Group } from '../groups/group.entity';
import { GroupMember } from '../groups/group-member.entity';
import { NewsPost } from '../news/news-post.entity';
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
    const progressRepository = dataSource.getRepository(AssignmentProgress);
    const notificationRepository = dataSource.getRepository(Notification);
    const templateRepository = dataSource.getRepository(Template);
    const templateStepRepository = dataSource.getRepository(TemplateStep);
    const groupRepository = dataSource.getRepository(Group);
    const groupMemberRepository = dataSource.getRepository(GroupMember);
    const newsRepository = dataSource.getRepository(NewsPost);

    // --- FK-safe wipe: one TRUNCATE ... CASCADE over all involved tables ---
    const repos = [
      progressRepository,   // step_progress
      assignmentRepository, // assignments
      templateStepRepository, // template_steps
      templateRepository,   // templates
      stepRepository,       // task_steps (ar faktinis tavo pavadinimas)
      tagRepository,        // tags
      notificationRepository,
      newsRepository,
      groupMemberRepository,
      groupRepository,
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
      name: 'Administratorius',
    });

    const manager = userRepository.create({
      email: 'manager@example.com',
      passwordHash,
      role: UserRole.MANAGER,
      name: 'Vadovas',
    });

    const user = userRepository.create({
      email: 'jonas@example.com',
      passwordHash,
      role: UserRole.USER,
      name: 'Bitininkas Jonas',
    });

    await userRepository.save([admin, manager, user]);

    const communityGroup = groupRepository.create({
      name: 'Bendrystės klubas',
      description: 'Bitininkų bendruomenės grupė',
    });

    const forestGroup = groupRepository.create({
      name: 'Miško bitininkai',
      description: 'Grupė darbui miškuose',
    });

    await groupRepository.save([communityGroup, forestGroup]);

    await groupMemberRepository.save([
      groupMemberRepository.create({ groupId: communityGroup.id, userId: admin.id }),
      groupMemberRepository.create({ groupId: communityGroup.id, userId: manager.id }),
      groupMemberRepository.create({ groupId: communityGroup.id, userId: user.id }),
      groupMemberRepository.create({ groupId: forestGroup.id, userId: manager.id }),
    ]);

    const hive1 = hiveRepository.create({
      label: 'Avilys Alfa',
      ownerUserId: user.id,
      status: HiveStatus.ACTIVE,
    });

    const hive2 = hiveRepository.create({
      label: 'Avilys Beta',
      ownerUserId: user.id,
      status: HiveStatus.PAUSED,
    });

    const hive3 = hiveRepository.create({
      label: 'Avilys Gama',
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
      title: 'Pavasarinė apžiūra',
      description: 'Patikrinkite avilius po žiemos',
      category: 'inspection',
      seasonMonths: [3, 4],
      frequency: TaskFrequency.ONCE,
      defaultDueDays: 7,
      createdByUserId: manager.id,
    });

    const task2 = taskRepository.create({
      title: 'Medunešio derlius',
      description: 'Surinkite medų iš meduvių',
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
      { title: 'Paruošti įrankius', orderIndex: 1, taskId: task1.id },
      { title: 'Apžiūrėti perų rėmus', orderIndex: 2, taskId: task1.id },
      { title: 'Įvertinti maisto atsargas', orderIndex: 3, taskId: task1.id },
    ];

    const stepsTask2 = [
      { title: 'Pridėti tuščias meduves', orderIndex: 1, taskId: task2.id },
      { title: 'Surinkti pilnas meduves', orderIndex: 2, taskId: task2.id },
      { title: 'Išsukti medų', orderIndex: 3, taskId: task2.id },
      { title: 'Supilstyti medų į indus', orderIndex: 4, taskId: task2.id },
    ];

    const savedSteps = await stepRepository.save([
      ...stepsTask1.map((step) => stepRepository.create(step)),
      ...stepsTask2.map((step) => stepRepository.create(step)),
    ]);

    const prepareToolsStep = savedSteps.find((step) => step.title === 'Paruošti įrankius');
    const addEmptySupersStep = savedSteps.find(
      (step) => step.title === 'Pridėti tuščias meduves',
    );
    const inspectBroodFramesStep = savedSteps.find(
      (step) => step.title === 'Apžiūrėti perų rėmus',
    );
    const collectFullSupersStep = savedSteps.find(
      (step) => step.title === 'Surinkti pilnas meduves',
    );
    const extractHoneyStep = savedSteps.find((step) => step.title === 'Išsukti medų');

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

    if (inspectBroodFramesStep) {
      await dataSource
        .createQueryBuilder()
        .relation(TaskStep, 'tags')
        .of(inspectBroodFramesStep.id)
        .add(springTag.id);
    }

    if (collectFullSupersStep) {
      await dataSource
        .createQueryBuilder()
        .relation(TaskStep, 'tags')
        .of(collectFullSupersStep.id)
        .add(generalTag.id);
    }

    if (extractHoneyStep) {
      await dataSource
        .createQueryBuilder()
        .relation(TaskStep, 'tags')
        .of(extractHoneyStep.id)
        .add(generalTag.id);
    }

    const inspectionTemplate = templateRepository.create({
      title: 'Pavasarinės apžiūros šablonas',
      comment: 'Pilnas pavasarinės avilio apžiūros planas',
      steps: savedSteps
        .filter((step) => step.taskId === task1.id)
        .slice(0, 3)
        .map((step, index) =>
          templateStepRepository.create({
            taskStepId: step.id,
            orderIndex: index + 1,
          }),
        ),
    });

    const harvestTemplate = templateRepository.create({
      title: 'Medunešio derliaus šablonas',
      comment: 'Paruoškite medų žingsnis po žingsnio',
      steps: savedSteps
        .filter((step) => step.taskId === task2.id)
        .slice(0, 4)
        .map((step, index) =>
          templateStepRepository.create({
            taskStepId: step.id,
            orderIndex: index + 1,
          }),
        ),
    });

    const quickCheckTemplate = templateRepository.create({
      title: 'Greitos patikros šablonas',
      comment: 'Trumpa apžiūra prieš sezono pradžią',
      steps: savedSteps
        .filter((step) => step.taskId === task1.id)
        .slice(0, 3)
        .map((step, index) =>
          templateStepRepository.create({
            taskStepId: step.id,
            orderIndex: index + 1,
          }),
        ),
    });

    await templateRepository.save([inspectionTemplate, harvestTemplate, quickCheckTemplate]);

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

    const baseProgressEntries: AssignmentProgress[] = [];

    const appendEntries = (assignment: Assignment, taskId: string, participantId: string) => {
      const taskSteps = savedSteps.filter((step) => step.taskId === taskId);

      for (const step of taskSteps) {
        baseProgressEntries.push(
          progressRepository.create({
            assignmentId: assignment.id,
            taskStepId: step.id,
            userId: participantId,
            status: AssignmentProgressStatus.PENDING,
            completedAt: null,
          }),
        );
      }
    };

    appendEntries(assignment1, task1.id, user.id);
    appendEntries(assignment2, task2.id, user.id);

    const completedEntries = baseProgressEntries
      .filter((entry) => entry.assignmentId === assignment1.id)
      .slice(0, 2);

    for (const entry of completedEntries) {
      entry.status = AssignmentProgressStatus.COMPLETED;
      entry.completedAt = new Date();
      entry.notes = 'Žingsnis atliktas pavasarinės apžiūros metu';
    }

    await progressRepository.save(baseProgressEntries);

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

    const seasonNews = newsRepository.create({
      title: 'Pavasario sezonas prasideda',
      body: 'Patikrinkite avilius, papildykite pašarus ir suplanuokite pirmuosius darbus.',
      targetAll: true,
      imageUrl:
        'https://images.unsplash.com/photo-1501700493788-fa1a0d4e783d?auto=format&fit=crop&w=1200&q=80',
    });

    const forestNews = newsRepository.create({
      title: 'Miško bitininkų susitikimas',
      body: 'Miško bitininkų grupės nariai kviečiami į susitikimą aptarti pavasario darbus.',
      targetAll: false,
      imageUrl: null,
      groups: [forestGroup],
    });

    const communityNews = newsRepository.create({
      title: 'Bendrystės klubo dirbtuvės',
      body: 'Bendrystės klubo nariai kviečiami į šeštadienio dirbtuves – dalinsimės medaus produktų receptais ir pasiruošimo vasarai patarimais.',
      targetAll: false,
      imageUrl:
        'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80',
      groups: [communityGroup],
    });

    await newsRepository.save([seasonNews, forestNews, communityNews]);

    console.log('Sėklos sėkmingai įkeltos');
  } catch (error) {
    console.error('Sėklų įkėlimas nepavyko', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void runSeed();
