import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStartDateToAssignments1728000000000 implements MigrationInterface {
  name = 'AddStartDateToAssignments1728000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'assignments',
      new TableColumn({
        name: 'start_date',
        type: 'date',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('assignments', 'start_date');
  }
}
