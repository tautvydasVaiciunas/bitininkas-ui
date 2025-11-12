import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateHiveTags1731200000000 implements MigrationInterface {
  name = 'MigrateHiveTags1731200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hive_tags" (
        "id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hive_tags" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hive_tags_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "hive_tags" ("id", "name")
      SELECT DISTINCT t.id, t.name
      FROM "tags" t
      WHERE EXISTS (SELECT 1 FROM "hives" h WHERE h.tag_id = t.id)
        AND NOT EXISTS (SELECT 1 FROM "hive_tags" ht WHERE ht.id = t.id)
    `);

    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_hives_tag_id" ON "hives" ("tag_id")');
    await queryRunner.query('ALTER TABLE "hives" DROP CONSTRAINT IF EXISTS "FK_hives_tag"');
    await queryRunner.query(
      'ALTER TABLE "hives" ADD CONSTRAINT "FK_hives_tag_hive_tags" FOREIGN KEY ("tag_id") REFERENCES "hive_tags"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "hives" DROP CONSTRAINT IF EXISTS "FK_hives_tag_hive_tags"');
    await queryRunner.query(
      'ALTER TABLE "hives" ADD CONSTRAINT "FK_hives_tag" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_hives_tag_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "hive_tags"');
  }
}
