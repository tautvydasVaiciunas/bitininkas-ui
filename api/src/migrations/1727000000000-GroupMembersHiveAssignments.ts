import { MigrationInterface, QueryRunner } from "typeorm";

export class GroupMembersHiveAssignments1727000000000 implements MigrationInterface {
  name = "GroupMembersHiveAssignments1727000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "group_members" ADD COLUMN IF NOT EXISTS "hive_id" uuid',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_group_members_hive_id" ON "group_members" ("hive_id")',
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_group_members_hive'
        ) THEN
          ALTER TABLE "group_members"
            ADD CONSTRAINT "FK_group_members_hive"
            FOREIGN KEY ("hive_id") REFERENCES "hives"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_group_members_group_user'
        ) THEN
          ALTER TABLE "group_members" DROP CONSTRAINT "UQ_group_members_group_user";
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_group_members_group_user_hive'
        ) THEN
          ALTER TABLE "group_members"
            ADD CONSTRAINT "UQ_group_members_group_user_hive"
            UNIQUE ("group_id", "user_id", "hive_id");
        END IF;
      END
      $$;
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_group_members_group_user_null_hive" ON "group_members" ("group_id", "user_id") WHERE hive_id IS NULL',
    );

    await queryRunner.query(
      'ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "hive_id" uuid',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_ASSIGNMENTS_HIVE_ID" ON "assignments" ("hive_id")',
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'assignments' AND column_name = 'hive_id' AND is_nullable = 'NO'
        ) THEN
          ALTER TABLE "assignments" ALTER COLUMN "hive_id" DROP NOT NULL;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_assignments_hive'
        ) THEN
          ALTER TABLE "assignments"
            ADD CONSTRAINT "FK_assignments_hive"
            FOREIGN KEY ("hive_id") REFERENCES "hives"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_group_members_group_user_null_hive"',
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_group_members_group_user_hive'
        ) THEN
          ALTER TABLE "group_members" DROP CONSTRAINT "UQ_group_members_group_user_hive";
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_group_members_group_user'
        ) THEN
          ALTER TABLE "group_members"
            ADD CONSTRAINT "UQ_group_members_group_user"
            UNIQUE ("group_id", "user_id");
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_group_members_hive'
        ) THEN
          ALTER TABLE "group_members" DROP CONSTRAINT "FK_group_members_hive";
        END IF;
      END
      $$;
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_group_members_hive_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "group_members" DROP COLUMN IF EXISTS "hive_id"',
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_assignments_hive'
        ) THEN
          ALTER TABLE "assignments" DROP CONSTRAINT "FK_assignments_hive";
        END IF;
      END
      $$;
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_ASSIGNMENTS_HIVE_ID"',
    );
    await queryRunner.query(
      'ALTER TABLE "assignments" ALTER COLUMN "hive_id" SET NOT NULL',
    );
  }
}
