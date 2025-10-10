import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignColumnTypes1724000000000 implements MigrationInterface {
  name = 'AlignColumnTypes1724000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "email" TYPE character varying(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "password_hash" TYPE character varying(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "name" TYPE character varying(150)',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "name" SET DEFAULT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "phone" TYPE character varying(50)',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "phone" SET DEFAULT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "address" TYPE character varying(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "address" SET DEFAULT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE "groups" ALTER COLUMN "name" TYPE character varying(150)',
    );
    await queryRunner.query(
      'ALTER TABLE "groups" ALTER COLUMN "description" TYPE character varying(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "groups" ALTER COLUMN "description" SET DEFAULT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE "group_members" ALTER COLUMN "member_role" TYPE character varying(50)',
    );
    await queryRunner.query(
      'ALTER TABLE "group_members" ALTER COLUMN "member_role" SET DEFAULT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE "hives" ALTER COLUMN "label" TYPE character varying(150)',
    );
    await queryRunner.query(
      'ALTER TABLE "hives" ALTER COLUMN "location" TYPE character varying(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "hives" ALTER COLUMN "location" SET DEFAULT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "title" TYPE character varying(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "description" TYPE character varying(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "description" SET DEFAULT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "category" TYPE character varying(100)',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "category" SET DEFAULT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE "task_steps" ALTER COLUMN "title" TYPE character varying(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "task_steps" ALTER COLUMN "content_text" TYPE character varying(1000)',
    );
    await queryRunner.query(
      'ALTER TABLE "task_steps" ALTER COLUMN "content_text" SET DEFAULT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "task_steps" ALTER COLUMN "media_url" TYPE character varying(500)',
    );
    await queryRunner.query(
      'ALTER TABLE "task_steps" ALTER COLUMN "media_url" SET DEFAULT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE "step_progress" ALTER COLUMN "notes" TYPE character varying(1000)',
    );
    await queryRunner.query(
      'ALTER TABLE "step_progress" ALTER COLUMN "notes" SET DEFAULT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "step_progress" ALTER COLUMN "evidence_url" TYPE character varying(500)',
    );
    await queryRunner.query(
      'ALTER TABLE "step_progress" ALTER COLUMN "evidence_url" SET DEFAULT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE "activity_logs" ALTER COLUMN "entity" TYPE character varying(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_logs" ALTER COLUMN "user_id" SET DEFAULT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_logs" ALTER COLUMN "entity" SET DEFAULT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_logs" ALTER COLUMN "entity_id" SET DEFAULT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE "password_reset_tokens" ALTER COLUMN "token" TYPE character varying(255)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "password_reset_tokens" ALTER COLUMN "token" TYPE character varying',
    );

    await queryRunner.query(
      'ALTER TABLE "activity_logs" ALTER COLUMN "entity_id" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_logs" ALTER COLUMN "entity" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_logs" ALTER COLUMN "entity" TYPE text',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_logs" ALTER COLUMN "user_id" DROP DEFAULT',
    );

    await queryRunner.query(
      'ALTER TABLE "step_progress" ALTER COLUMN "evidence_url" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "step_progress" ALTER COLUMN "evidence_url" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "step_progress" ALTER COLUMN "notes" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "step_progress" ALTER COLUMN "notes" TYPE character varying',
    );

    await queryRunner.query(
      'ALTER TABLE "task_steps" ALTER COLUMN "media_url" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "task_steps" ALTER COLUMN "media_url" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "task_steps" ALTER COLUMN "content_text" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "task_steps" ALTER COLUMN "content_text" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "task_steps" ALTER COLUMN "title" TYPE character varying',
    );

    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "category" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "category" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "description" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "description" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "title" TYPE character varying',
    );

    await queryRunner.query(
      'ALTER TABLE "hives" ALTER COLUMN "location" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "hives" ALTER COLUMN "location" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "hives" ALTER COLUMN "label" TYPE character varying',
    );

    await queryRunner.query(
      'ALTER TABLE "group_members" ALTER COLUMN "member_role" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "group_members" ALTER COLUMN "member_role" TYPE character varying',
    );

    await queryRunner.query(
      'ALTER TABLE "groups" ALTER COLUMN "description" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "groups" ALTER COLUMN "description" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "groups" ALTER COLUMN "name" TYPE character varying',
    );

    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "address" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "address" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "phone" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "phone" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "name" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "password_hash" TYPE character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "email" TYPE character varying',
    );
  }
}
