import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignmentReview1740400000000 implements MigrationInterface {
  name = 'AddAssignmentReview1740400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS "review_status" VARCHAR(16) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "review_comment" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "review_by_user_id" UUID NULL,
      ADD COLUMN IF NOT EXISTS "review_at" TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      DROP COLUMN IF EXISTS "review_at",
      DROP COLUMN IF EXISTS "review_by_user_id",
      DROP COLUMN IF EXISTS "review_comment",
      DROP COLUMN IF EXISTS "review_status",
      DROP COLUMN IF EXISTS "completed_at"
    `);
  }
}
