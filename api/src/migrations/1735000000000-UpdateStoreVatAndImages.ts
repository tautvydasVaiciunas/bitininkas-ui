import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStoreVatAndImages1735000000000 implements MigrationInterface {
  name = 'UpdateStoreVatAndImages1735000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store_products"
      ADD COLUMN "image_urls" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "store_orders"
      ADD COLUMN "subtotal_net_cents" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "store_orders"
      ADD COLUMN "vat_cents" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE "store_orders"
      SET "subtotal_net_cents" = COALESCE("total_amount_cents", 0),
          "vat_cents" = 0
    `);

    await queryRunner.query(`
      ALTER TABLE "store_order_items"
      ADD COLUMN "unit_net_cents" integer NOT NULL DEFAULT 0,
      ADD COLUMN "unit_gross_cents" integer NOT NULL DEFAULT 0,
      ADD COLUMN "line_net_cents" integer NOT NULL DEFAULT 0,
      ADD COLUMN "line_gross_cents" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE "store_order_items"
      SET "unit_net_cents" = COALESCE("unit_price_cents", 0),
          "unit_gross_cents" = COALESCE("unit_price_cents", 0),
          "line_net_cents" = COALESCE("line_total_cents", 0),
          "line_gross_cents" = COALESCE("line_total_cents", 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "store_order_items" DROP COLUMN "unit_price_cents"
    `);

    await queryRunner.query(`
      ALTER TABLE "store_order_items" DROP COLUMN "line_total_cents"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store_order_items"
      ADD COLUMN "unit_price_cents" integer NOT NULL DEFAULT 0,
      ADD COLUMN "line_total_cents" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE "store_order_items"
      SET "unit_price_cents" = COALESCE("unit_net_cents", 0),
          "line_total_cents" = COALESCE("line_net_cents", 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "store_order_items" DROP COLUMN "line_gross_cents"
    `);
    await queryRunner.query(`
      ALTER TABLE "store_order_items" DROP COLUMN "line_net_cents"
    `);
    await queryRunner.query(`
      ALTER TABLE "store_order_items" DROP COLUMN "unit_gross_cents"
    `);
    await queryRunner.query(`
      ALTER TABLE "store_order_items" DROP COLUMN "unit_net_cents"
    `);

    await queryRunner.query(`
      ALTER TABLE "store_orders" DROP COLUMN "vat_cents"
    `);
    await queryRunner.query(`
      ALTER TABLE "store_orders" DROP COLUMN "subtotal_net_cents"
    `);

    await queryRunner.query(`
      ALTER TABLE "store_products" DROP COLUMN "image_urls"
    `);
  }
}
