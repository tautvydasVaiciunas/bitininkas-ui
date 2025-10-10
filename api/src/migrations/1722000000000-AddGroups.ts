import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroups1722000000000 implements MigrationInterface {
  name = 'AddGroups1722000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "description" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_groups_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_groups_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "group_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "group_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "member_role" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_group_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_group_members_group_user" UNIQUE ("group_id", "user_id"),
        CONSTRAINT "FK_group_members_group" FOREIGN KEY ("group_id")
          REFERENCES "groups"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_group_members_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_group_members_group_id" ON "group_members" ("group_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_group_members_user_id" ON "group_members" ("user_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_group_members_user_id"');
    await queryRunner.query('DROP INDEX "IDX_group_members_group_id"');
    await queryRunner.query('DROP TABLE "group_members"');
    await queryRunner.query('DROP TABLE "groups"');
  }
}
