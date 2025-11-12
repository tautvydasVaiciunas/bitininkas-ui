import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHiveTagRelation1731100000000 implements MigrationInterface {
  name = 'AddHiveTagRelation1731100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hive_tags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hive_tags" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hive_tags_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query('ALTER TABLE "hives" ADD "tag_id" uuid');
    await queryRunner.query('CREATE INDEX "IDX_hives_tag_id" ON "hives" ("tag_id")');
    await queryRunner.query(
      'ALTER TABLE "hives" ADD CONSTRAINT "FK_hives_tag" FOREIGN KEY ("tag_id") REFERENCES "hive_tags"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "hives" DROP CONSTRAINT "FK_hives_tag"');
    await queryRunner.query('DROP INDEX "public"."IDX_hives_tag_id"');
    await queryRunner.query('ALTER TABLE "hives" DROP COLUMN "tag_id"');
    await queryRunner.query('DROP TABLE "hive_tags"');
  }
}
