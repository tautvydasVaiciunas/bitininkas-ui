import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStoredUploads1755000000000 implements MigrationInterface {
  name = 'CreateStoredUploads1755000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "stored_uploads" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "relative_path" character varying(255) NOT NULL,
        "mime_type" character varying(120) NOT NULL,
        "size_bytes" integer NOT NULL,
        "data" bytea NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stored_uploads_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_stored_uploads_relative_path" UNIQUE ("relative_path")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "stored_uploads"');
  }
}
