import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastMessageEmailAtToUsers1740200000000 implements MigrationInterface {
  name = 'AddLastMessageEmailAtToUsers1740200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "last_message_email_at" TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "last_message_email_at"
    `);
  }
}
