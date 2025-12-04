import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSubscriptionValidUntil1741300000000 implements MigrationInterface {
  name = 'AddUserSubscriptionValidUntil1741300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "subscription_valid_until" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "subscription_valid_until"`);
  }
}
