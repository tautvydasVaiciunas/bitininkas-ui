import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationReadColumns1731087600000 implements MigrationInterface {
  name = 'AddNotificationReadColumns1731087600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "is_read" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
        DROP COLUMN IF EXISTS "created_at",
        DROP COLUMN IF EXISTS "is_read"
    `);
  }
}
