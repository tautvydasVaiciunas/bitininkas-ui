import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandTaskStepContentText1739700000000 implements MigrationInterface {
  name = 'ExpandTaskStepContentText1739700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "task_steps"
      ALTER COLUMN "content_text" TYPE text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "task_steps"
      ALTER COLUMN "content_text" TYPE character varying(1000)
    `);
  }
}
