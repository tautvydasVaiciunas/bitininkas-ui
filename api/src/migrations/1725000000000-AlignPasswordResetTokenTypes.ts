import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignPasswordResetTokenTypes1725000000000
  implements MigrationInterface
{
  name = 'AlignPasswordResetTokenTypes1725000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "password_reset_tokens" ALTER COLUMN "token" TYPE character varying(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "password_reset_tokens" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "password_reset_tokens" ALTER COLUMN "created_at" TYPE TIMESTAMP',
    );
    await queryRunner.query(
      'ALTER TABLE "password_reset_tokens" ALTER COLUMN "token" TYPE character varying',
    );
  }
}
