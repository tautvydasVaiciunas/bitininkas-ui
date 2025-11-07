import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsTitleBodyLink20251107 implements MigrationInterface {
  name = 'AddNotificationsTitleBodyLink20251107';

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
