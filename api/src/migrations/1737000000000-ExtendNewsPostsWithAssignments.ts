import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class ExtendNewsPostsWithAssignments1737000000000 implements MigrationInterface {
  name = 'ExtendNewsPostsWithAssignments1737000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'news_posts',
      new TableColumn({
        name: 'attached_task_id',
        type: 'uuid',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'news_posts',
      new TableColumn({
        name: 'assignment_start_date',
        type: 'date',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'news_posts',
      new TableColumn({
        name: 'assignment_due_date',
        type: 'date',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'news_posts',
      new TableColumn({
        name: 'send_notifications',
        type: 'boolean',
        isNullable: false,
        default: true,
      }),
    );
    await queryRunner.createForeignKey(
      'news_posts',
      new TableForeignKey({
        columnNames: ['attached_task_id'],
        referencedTableName: 'tasks',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const foreignKey = await queryRunner.getTable('news_posts').then((table) => {
      return table?.foreignKeys.find((fk) => fk.columnNames.includes('attached_task_id'));
    });
    if (foreignKey) {
      await queryRunner.dropForeignKey('news_posts', foreignKey);
    }
    await queryRunner.dropColumn('news_posts', 'send_notifications');
    await queryRunner.dropColumn('news_posts', 'assignment_due_date');
    await queryRunner.dropColumn('news_posts', 'assignment_start_date');
    await queryRunner.dropColumn('news_posts', 'attached_task_id');
  }
}
