import { MigrationInterface, QueryRunner } from 'typeorm';

export class HashPasswordResetTokens1731264000000 implements MigrationInterface {
  name = 'HashPasswordResetTokens1731264000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD "token_hash" character varying(128)`,
    );
    await queryRunner.query(
      `UPDATE "password_reset_tokens" SET "token_hash" = "token" WHERE "token" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ALTER COLUMN "token_hash" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "UQ_password_reset_tokens_token_hash" UNIQUE ("token_hash")`,
    );
    await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP COLUMN "token"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD "token" character varying(255)`,
    );
    await queryRunner.query(
      `UPDATE "password_reset_tokens" SET "token" = "token_hash" WHERE "token_hash" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ALTER COLUMN "token" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "UQ_password_reset_tokens_token" UNIQUE ("token")`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "UQ_password_reset_tokens_token_hash"`,
    );
    await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP COLUMN "token_hash"`);
  }
}
