import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStoreTables1734000000000 implements MigrationInterface {
  name = 'CreateStoreTables1734000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "store_products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying(140) NOT NULL,
        "title" character varying(180) NOT NULL,
        "short_description" character varying(280),
        "description" text NOT NULL,
        "price_cents" integer NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_products_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_STORE_PRODUCTS_SLUG" ON "store_products" ("slug")
    `);

    await queryRunner.query(`
      CREATE TYPE "store_orders_status_enum" AS ENUM ('new', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TABLE "store_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "status" "store_orders_status_enum" NOT NULL DEFAULT 'new',
        "customer_name" character varying(180) NOT NULL,
        "customer_email" character varying(180) NOT NULL,
        "customer_phone" character varying(60) NOT NULL,
        "company_name" character varying(180),
        "company_code" character varying(60),
        "vat_code" character varying(60),
        "address" character varying(255),
        "comment" text,
        "total_amount_cents" integer NOT NULL,
        "user_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_orders_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_STORE_ORDERS_CUSTOMER_EMAIL" ON "store_orders" ("customer_email")
    `);

    await queryRunner.query(`
      CREATE TABLE "store_order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "product_id" uuid,
        "product_title" character varying(200) NOT NULL,
        "unit_price_cents" integer NOT NULL,
        "quantity" integer NOT NULL,
        "line_total_cents" integer NOT NULL,
        CONSTRAINT "PK_store_order_items_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "store_orders"
      ADD CONSTRAINT "FK_store_orders_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "store_order_items"
      ADD CONSTRAINT "FK_store_order_items_order" FOREIGN KEY ("order_id") REFERENCES "store_orders"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "store_order_items"
      ADD CONSTRAINT "FK_store_order_items_product" FOREIGN KEY ("product_id") REFERENCES "store_products"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store_order_items" DROP CONSTRAINT "FK_store_order_items_product"
    `);

    await queryRunner.query(`
      ALTER TABLE "store_order_items" DROP CONSTRAINT "FK_store_order_items_order"
    `);

    await queryRunner.query(`
      ALTER TABLE "store_orders" DROP CONSTRAINT "FK_store_orders_user"
    `);

    await queryRunner.query(`DROP TABLE "store_order_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_STORE_ORDERS_CUSTOMER_EMAIL"`);
    await queryRunner.query(`DROP TABLE "store_orders"`);
    await queryRunner.query(`DROP TYPE "store_orders_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_STORE_PRODUCTS_SLUG"`);
    await queryRunner.query(`DROP TABLE "store_products"`);
  }
}
