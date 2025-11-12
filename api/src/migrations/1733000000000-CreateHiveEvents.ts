import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHiveEvents1733000000000 implements MigrationInterface {
  name = 'CreateHiveEvents1733000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."hive_events_type_enum" AS ENUM ('HIVE_UPDATED', 'TASK_ASSIGNED', 'TASK_DATES_CHANGED', 'TASK_COMPLETED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "hive_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "hive_id" uuid NOT NULL,
        "type" "public"."hive_events_type_enum" NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "user_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hive_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_HIVE_EVENTS_HIVE_ID" ON "hive_events" ("hive_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_HIVE_EVENTS_CREATED_AT" ON "hive_events" ("created_at")`,
    );
    await queryRunner.query(`
      ALTER TABLE "hive_events"
      ADD CONSTRAINT "FK_HIVE_EVENTS_HIVE" FOREIGN KEY ("hive_id") REFERENCES "hives"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "hive_events"
      ADD CONSTRAINT "FK_HIVE_EVENTS_USER" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hive_events" DROP CONSTRAINT "FK_HIVE_EVENTS_USER"`);
    await queryRunner.query(`ALTER TABLE "hive_events" DROP CONSTRAINT "FK_HIVE_EVENTS_HIVE"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_HIVE_EVENTS_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_HIVE_EVENTS_HIVE_ID"`);
    await queryRunner.query(`DROP TABLE "hive_events"`);
    await queryRunner.query(`DROP TYPE "public"."hive_events_type_enum"`);
  }
}
