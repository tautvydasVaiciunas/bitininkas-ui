import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHiveMembers1728001000000 implements MigrationInterface {
  name = 'CreateHiveMembers1728001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hive_members" (
        "hive_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        PRIMARY KEY ("hive_id", "user_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "hive_members"
      ADD CONSTRAINT "fk_hive_members_hive"
      FOREIGN KEY ("hive_id")
      REFERENCES "hives"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "hive_members"
      ADD CONSTRAINT "fk_hive_members_user"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_hive_members_user"
      ON "hive_members" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_hive_members_user"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "hive_members"
    `);
  }
}
