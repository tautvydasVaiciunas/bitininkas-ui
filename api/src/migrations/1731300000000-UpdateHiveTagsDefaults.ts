import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateHiveTagsDefaults1731300000000 implements MigrationInterface {
  name = 'UpdateHiveTagsDefaults1731300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "hive_tags" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()');
    await queryRunner.query("ALTER TABLE \"hive_tags\" ADD COLUMN IF NOT EXISTS \"color\" character varying(7) NOT NULL DEFAULT '#F9D776'");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "hive_tags" DROP COLUMN IF EXISTS "color"');
    await queryRunner.query('ALTER TABLE "hive_tags" ALTER COLUMN "id" DROP DEFAULT');
  }
}
