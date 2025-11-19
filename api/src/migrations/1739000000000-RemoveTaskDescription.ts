import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTaskDescription1739000000000 implements MigrationInterface {
  name = 'RemoveTaskDescription1739000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      DROP COLUMN "description"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD "description" character varying(255) DEFAULT NULL
    `);
  }
}
