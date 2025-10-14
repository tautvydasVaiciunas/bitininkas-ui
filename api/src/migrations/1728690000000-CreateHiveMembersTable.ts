import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHiveMembersTable1728690000000 implements MigrationInterface {
  name = 'CreateHiveMembersTable1728690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hive_members" (
        "hive_id" uuid NOT NULL,
        "user_id" uuid NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "hive_members"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "hive_members"
      DROP CONSTRAINT IF EXISTS "pk_hive_members"
    `);

    await queryRunner.query(`
      ALTER TABLE "hive_members"
      ADD CONSTRAINT "pk_hive_members" PRIMARY KEY ("hive_id", "user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "hive_members"
      DROP CONSTRAINT IF EXISTS "fk_hive_members_hive"
    `);

    await queryRunner.query(`
      ALTER TABLE "hive_members"
      ADD CONSTRAINT "fk_hive_members_hive" FOREIGN KEY ("hive_id") REFERENCES "hives"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "hive_members"
      DROP CONSTRAINT IF EXISTS "fk_hive_members_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "hive_members"
      ADD CONSTRAINT "fk_hive_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_hive_members_user"
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_hive_members_user_id" ON "hive_members" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_hive_members_user_id"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "hive_members"
    `);
  }
}
