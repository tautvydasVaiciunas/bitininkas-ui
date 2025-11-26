import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowHiveOwnerNullable1740800000000 implements MigrationInterface {
  name = 'AllowHiveOwnerNullable1740800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "hives" ALTER COLUMN "owner_user_id" DROP NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "hives" ALTER COLUMN "owner_user_id" SET NOT NULL',
    );
  }
}
