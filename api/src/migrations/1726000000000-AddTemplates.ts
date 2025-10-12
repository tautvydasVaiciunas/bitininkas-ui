import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplates1726000000000 implements MigrationInterface {
  name = 'AddTemplates1726000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_templates_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "template_steps" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL,
        "task_step_id" uuid NOT NULL,
        "order_index" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_steps_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_template_steps_template_order" UNIQUE ("template_id", "order_index"),
        CONSTRAINT "FK_template_steps_template" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_template_steps_task_step" FOREIGN KEY ("task_step_id") REFERENCES "task_steps"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "template_steps"');
    await queryRunner.query('DROP TABLE "templates"');
  }
}
