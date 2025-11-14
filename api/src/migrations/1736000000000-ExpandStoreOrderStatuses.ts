import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandStoreOrderStatuses1736000000000 implements MigrationInterface {
  name = 'ExpandStoreOrderStatuses1736000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "store_orders_status_enum_new" AS ENUM ('new', 'in_progress', 'completed', 'cancelled')
    `);

    await queryRunner.query(`
      ALTER TABLE "store_orders"
      ALTER COLUMN "status" DROP DEFAULT,
      ALTER COLUMN "status" TYPE "store_orders_status_enum_new" USING "status"::text::"store_orders_status_enum_new",
      ALTER COLUMN "status" SET DEFAULT 'new'
    `);

    await queryRunner.query(`DROP TYPE "store_orders_status_enum"`);
    await queryRunner.query(`ALTER TYPE "store_orders_status_enum_new" RENAME TO "store_orders_status_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "store_orders_status_enum_old" AS ENUM ('new', 'cancelled')
    `);

    await queryRunner.query(`
      ALTER TABLE "store_orders"
      ALTER COLUMN "status" DROP DEFAULT,
      ALTER COLUMN "status" TYPE "store_orders_status_enum_old"
      USING (
        CASE
          WHEN "status" = 'in_progress' THEN 'new'
          WHEN "status" = 'completed' THEN 'new'
          ELSE "status"::text
        END
      )::"store_orders_status_enum_old",
      ALTER COLUMN "status" SET DEFAULT 'new'
    `);

    await queryRunner.query(`DROP TYPE "store_orders_status_enum"`);
    await queryRunner.query(`ALTER TYPE "store_orders_status_enum_old" RENAME TO "store_orders_status_enum"`);
  }
}

