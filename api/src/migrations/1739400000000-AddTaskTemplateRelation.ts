import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddTaskTemplateRelation1739400000000 implements MigrationInterface {
  name = 'AddTaskTemplateRelation1739400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'template_id',
        type: 'uuid',
        isNullable: true,
      }),
    );
    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['template_id'],
        referencedTableName: 'templates',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tasks');
    const foreignKey = table?.foreignKeys.find((fk) => fk.columnNames.includes('template_id'));
    if (foreignKey) {
      await queryRunner.dropForeignKey('tasks', foreignKey);
    }
    await queryRunner.dropColumn('tasks', 'template_id');
  }
}
