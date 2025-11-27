import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssignmentStepMedia1741200000000 implements MigrationInterface {
  name = 'CreateAssignmentStepMedia1741200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "assignment_step_media" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "assignment_id" uuid NOT NULL,
        "step_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "url" character varying(512) NOT NULL,
        "mime_type" character varying(255) NOT NULL,
        "kind" character varying(32) NOT NULL,
        "size_bytes" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assignment_step_media" PRIMARY KEY ("id"),
        CONSTRAINT "FK_assignment_step_media_assignment" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_step_media_step" FOREIGN KEY ("step_id") REFERENCES "task_steps"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_step_media_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_assignment_step_media_assignment" ON "assignment_step_media" ("assignment_id");
      CREATE INDEX "IDX_assignment_step_media_step" ON "assignment_step_media" ("step_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "assignment_step_media";
    `);
  }
}
