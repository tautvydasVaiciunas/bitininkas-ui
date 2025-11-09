import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAvatarUrl1731350400000 implements MigrationInterface {
  name = "AddUserAvatarUrl1731350400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "avatar_url" character varying(255)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "avatar_url"');
  }
}
