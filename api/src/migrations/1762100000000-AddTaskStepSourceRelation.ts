import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

type TemplateStepRow = {
  templateId: string;
  sourceTaskStepId: string;
  orderIndex: number;
  title: string;
  contentText: string;
  mediaUrl: string;
  mediaType: string;
  requireUserMedia: boolean;
};

type TaskStepRow = {
  taskId: string;
  templateId: string | null;
  taskStepId: string;
  orderIndex: number;
  title: string;
  contentText: string;
  mediaUrl: string;
  mediaType: string;
  requireUserMedia: boolean;
};

export class AddTaskStepSourceRelation1762100000000 implements MigrationInterface {
  name = 'AddTaskStepSourceRelation1762100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'task_steps',
      new TableColumn({
        name: 'source_task_step_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      'task_steps',
      new TableIndex({
        name: 'IDX_task_steps_source_task_step_id',
        columnNames: ['source_task_step_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'task_steps',
      new TableForeignKey({
        columnNames: ['source_task_step_id'],
        referencedTableName: 'task_steps',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await this.backfillFromKnownTemplateLinks(queryRunner);
    await this.backfillFromUniqueTemplateSignatures(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('task_steps');
    const foreignKey = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes('source_task_step_id'),
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('task_steps', foreignKey);
    }

    const index = table?.indices.find((item) => item.name === 'IDX_task_steps_source_task_step_id');
    if (index) {
      await queryRunner.dropIndex('task_steps', index);
    }

    await queryRunner.dropColumn('task_steps', 'source_task_step_id');
  }

  private buildSignature(
    steps: Array<{
      title: string;
      contentText: string;
      mediaUrl: string;
      mediaType: string;
      requireUserMedia: boolean;
    }>,
  ) {
    return JSON.stringify(
      steps.map((step) => ({
        title: step.title,
        contentText: step.contentText,
        mediaUrl: step.mediaUrl,
        mediaType: step.mediaType,
        requireUserMedia: step.requireUserMedia,
      })),
    );
  }

  private groupByTask(rows: TaskStepRow[]) {
    const map = new Map<string, TaskStepRow[]>();
    for (const row of rows) {
      const list = map.get(row.taskId) ?? [];
      list.push(row);
      map.set(row.taskId, list);
    }
    return map;
  }

  private groupByTemplate(rows: TemplateStepRow[]) {
    const map = new Map<string, TemplateStepRow[]>();
    for (const row of rows) {
      const list = map.get(row.templateId) ?? [];
      list.push(row);
      map.set(row.templateId, list);
    }
    return map;
  }

  private async backfillFromKnownTemplateLinks(queryRunner: QueryRunner) {
    const templateRows = await this.fetchTemplateSteps(queryRunner);
    const templateStepsByTemplateId = this.groupByTemplate(templateRows);
    const taskRows = await this.fetchTaskSteps(queryRunner, 't.template_id IS NOT NULL');
    const taskStepsByTaskId = this.groupByTask(taskRows);

    for (const [taskId, steps] of taskStepsByTaskId.entries()) {
      const templateId = steps[0]?.templateId;
      if (!templateId) {
        continue;
      }

      const templateSteps = templateStepsByTemplateId.get(templateId);
      if (!templateSteps || templateSteps.length !== steps.length) {
        continue;
      }

      const updates = steps
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((step, index) => ({
          taskStepId: step.taskStepId,
          sourceTaskStepId: templateSteps[index]?.sourceTaskStepId ?? null,
        }))
        .filter((item) => item.sourceTaskStepId);

      await this.applySourceUpdates(queryRunner, updates);
    }
  }

  private async backfillFromUniqueTemplateSignatures(queryRunner: QueryRunner) {
    const templateRows = await this.fetchTemplateSteps(queryRunner);
    const templateStepsByTemplateId = this.groupByTemplate(templateRows);
    const templateIdsBySignature = new Map<string, string[]>();

    for (const [templateId, steps] of templateStepsByTemplateId.entries()) {
      const signature = this.buildSignature(
        steps
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((step) => ({
            title: step.title,
            contentText: step.contentText,
            mediaUrl: step.mediaUrl,
            mediaType: step.mediaType,
            requireUserMedia: step.requireUserMedia,
          })),
      );
      const list = templateIdsBySignature.get(signature) ?? [];
      list.push(templateId);
      templateIdsBySignature.set(signature, list);
    }

    const taskRows = await this.fetchTaskSteps(
      queryRunner,
      't.template_id IS NULL AND EXISTS (SELECT 1 FROM assignments a WHERE a.task_id = t.id)',
    );
    const taskStepsByTaskId = this.groupByTask(taskRows);

    for (const [taskId, steps] of taskStepsByTaskId.entries()) {
      const orderedTaskSteps = steps.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      const signature = this.buildSignature(
        orderedTaskSteps.map((step) => ({
          title: step.title,
          contentText: step.contentText,
          mediaUrl: step.mediaUrl,
          mediaType: step.mediaType,
          requireUserMedia: step.requireUserMedia,
        })),
      );

      const matchingTemplateIds = templateIdsBySignature.get(signature) ?? [];
      if (matchingTemplateIds.length !== 1) {
        continue;
      }

      const templateId = matchingTemplateIds[0];
      const templateSteps = templateStepsByTemplateId.get(templateId);
      if (!templateSteps || templateSteps.length !== orderedTaskSteps.length) {
        continue;
      }

      await queryRunner.query(`UPDATE "tasks" SET "template_id" = $1 WHERE "id" = $2`, [
        templateId,
        taskId,
      ]);

      const updates = orderedTaskSteps.map((step, index) => ({
        taskStepId: step.taskStepId,
        sourceTaskStepId: templateSteps[index]?.sourceTaskStepId ?? null,
      }));
      await this.applySourceUpdates(queryRunner, updates);
    }
  }

  private async applySourceUpdates(
    queryRunner: QueryRunner,
    updates: Array<{ taskStepId: string; sourceTaskStepId: string | null }>,
  ) {
    for (const update of updates) {
      if (!update.sourceTaskStepId) {
        continue;
      }

      await queryRunner.query(
        `UPDATE "task_steps" SET "source_task_step_id" = $1 WHERE "id" = $2 AND "source_task_step_id" IS NULL`,
        [update.sourceTaskStepId, update.taskStepId],
      );
    }
  }

  private async fetchTemplateSteps(queryRunner: QueryRunner): Promise<TemplateStepRow[]> {
    return queryRunner.query(`
      SELECT
        ts.template_id AS "templateId",
        ts.task_step_id AS "sourceTaskStepId",
        ts.order_index AS "orderIndex",
        src.title AS "title",
        COALESCE(src.content_text, '') AS "contentText",
        COALESCE(src.media_url, '') AS "mediaUrl",
        COALESCE(src.media_type, '') AS "mediaType",
        src.require_user_media AS "requireUserMedia"
      FROM template_steps ts
      INNER JOIN task_steps src ON src.id = ts.task_step_id
      ORDER BY ts.template_id ASC, ts.order_index ASC, ts.id ASC
    `);
  }

  private async fetchTaskSteps(queryRunner: QueryRunner, whereClause: string): Promise<TaskStepRow[]> {
    return queryRunner.query(`
      SELECT
        t.id AS "taskId",
        t.template_id AS "templateId",
        s.id AS "taskStepId",
        s.order_index AS "orderIndex",
        s.title AS "title",
        COALESCE(s.content_text, '') AS "contentText",
        COALESCE(s.media_url, '') AS "mediaUrl",
        COALESCE(s.media_type, '') AS "mediaType",
        s.require_user_media AS "requireUserMedia"
      FROM tasks t
      INNER JOIN task_steps s ON s.task_id = t.id
      WHERE ${whereClause}
      ORDER BY t.id ASC, s.order_index ASC, s.id ASC
    `);
  }
}
