import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaFieldsToTaskSteps1727000000000 implements MigrationInterface {
  name = 'AddMediaFieldsToTaskSteps1727000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "task_steps" ADD COLUMN "media_type" character varying(20) DEFAULT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "task_steps" ADD COLUMN "require_user_media" boolean NOT NULL DEFAULT false',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "task_steps" DROP COLUMN "require_user_media"');
    await queryRunner.query('ALTER TABLE "task_steps" DROP COLUMN "media_type"');
  }
}
