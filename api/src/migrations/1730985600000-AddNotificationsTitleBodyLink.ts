import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsTitleBodyLink1730985600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "title" text NULL,
        ADD COLUMN IF NOT EXISTS "body" text NULL,
        ADD COLUMN IF NOT EXISTS "link" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
        DROP COLUMN IF EXISTS "title",
        DROP COLUMN IF EXISTS "body",
        DROP COLUMN IF EXISTS "link"
    `);
  }
}
