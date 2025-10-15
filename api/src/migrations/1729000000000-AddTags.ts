import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTags1729000000000 implements MigrationInterface {
  name = 'AddTags1729000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tags_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tags_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task_step_tags" (
        "step_id" uuid NOT NULL,
        "tag_id" uuid NOT NULL,
        CONSTRAINT "PK_task_step_tags" PRIMARY KEY ("step_id", "tag_id"),
        CONSTRAINT "FK_task_step_tags_step" FOREIGN KEY ("step_id") REFERENCES "task_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_task_step_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_task_step_tags_step" ON "task_step_tags" ("step_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_task_step_tags_tag" ON "task_step_tags" ("tag_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_task_step_tags_tag"');
    await queryRunner.query('DROP INDEX "IDX_task_step_tags_step"');
    await queryRunner.query('DROP TABLE "task_step_tags"');
    await queryRunner.query('DROP TABLE "tags"');
  }
}
