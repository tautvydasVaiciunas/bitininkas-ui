import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssignmentProgress1731000000000 implements MigrationInterface {
  name = 'CreateAssignmentProgress1731000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"assignment_progress_status_enum\" AS ENUM ('pending', 'completed')",
    );

    await queryRunner.query(`
      CREATE TABLE "assignment_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assignment_id" uuid NOT NULL,
        "task_step_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" "assignment_progress_status_enum" NOT NULL DEFAULT 'pending',
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "notes" character varying(1000),
        "evidence_url" character varying(500),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assignment_progress_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_assignment_progress_assignment" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_progress_task_step" FOREIGN KEY ("task_step_id") REFERENCES "task_steps"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_progress_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_assignment_progress_unique" ON "assignment_progress" ("assignment_id", "task_step_id", "user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_assignment_progress_assignment" ON "assignment_progress" ("assignment_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_assignment_progress_user" ON "assignment_progress" ("user_id")',
    );

    await queryRunner.query(`
      INSERT INTO "assignment_progress" (
        id,
        assignment_id,
        task_step_id,
        user_id,
        status,
        completed_at,
        notes,
        evidence_url,
        created_at,
        updated_at
      )
      SELECT
        sp.id,
        sp.assignment_id,
        sp.task_step_id,
        h.owner_user_id,
        'completed',
        sp.completed_at,
        sp.notes,
        sp.evidence_url,
        COALESCE(sp.completed_at, now()),
        COALESCE(sp.completed_at, now())
      FROM "step_progress" sp
      INNER JOIN "assignments" a ON a.id = sp.assignment_id
      INNER JOIN "hives" h ON h.id = a.hive_id
      WHERE h.owner_user_id IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO "assignment_progress" (
        assignment_id,
        task_step_id,
        user_id,
        status,
        completed_at,
        notes,
        evidence_url,
        created_at,
        updated_at
      )
      SELECT
        a.id,
        ts.id,
        participant.user_id,
        'pending',
        NULL,
        NULL,
        NULL,
        now(),
        now()
      FROM "assignments" a
      INNER JOIN "hives" h ON h.id = a.hive_id
      INNER JOIN "task_steps" ts ON ts.task_id = a.task_id
      INNER JOIN LATERAL (
        SELECT h.owner_user_id AS user_id
        UNION
        SELECT hm.user_id
        FROM "hive_members" hm
        WHERE hm.hive_id = h.id
      ) participant ON participant.user_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query('DROP TABLE IF EXISTS "step_progress"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "step_progress" (' +
        '"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ' +
        '"assignment_id" uuid NOT NULL, ' +
        '"task_step_id" uuid NOT NULL, ' +
        '"completed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ' +
        '"notes" character varying(1000), ' +
        '"evidence_url" character varying(500), ' +
        'CONSTRAINT "PK_step_progress_id" PRIMARY KEY ("id"), ' +
        'CONSTRAINT "FK_step_progress_assignment" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE, ' +
        'CONSTRAINT "FK_step_progress_task_step" FOREIGN KEY ("task_step_id") REFERENCES "task_steps"("id") ON DELETE CASCADE, ' +
        'CONSTRAINT "UQ_step_progress_assignment_step" UNIQUE ("assignment_id", "task_step_id")' +
      ')',
    );

    await queryRunner.query(`
      INSERT INTO "step_progress" (
        id,
        assignment_id,
        task_step_id,
        completed_at,
        notes,
        evidence_url
      )
      SELECT
        id,
        assignment_id,
        task_step_id,
        COALESCE(completed_at, now()),
        notes,
        evidence_url
      FROM "assignment_progress"
      WHERE status = 'completed'
    `);

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_user"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_assignment"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_unique"');
    await queryRunner.query('DROP TABLE "assignment_progress"');
    await queryRunner.query('DROP TYPE "assignment_progress_status_enum"');
  }
}
