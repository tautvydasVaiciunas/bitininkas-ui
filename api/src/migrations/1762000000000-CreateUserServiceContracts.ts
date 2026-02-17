import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserServiceContracts1762000000000 implements MigrationInterface {
  name = 'CreateUserServiceContracts1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_service_contracts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "contract_number" character varying(80),
        "signed_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "template_hash" character varying(128) NOT NULL,
        "template_version" character varying(64) NOT NULL,
        "snapshot_markdown" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_service_contracts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_service_contracts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_service_contracts_user_id" ON "user_service_contracts" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_service_contracts_contract_number" ON "user_service_contracts" ("contract_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_user_service_contracts_contract_number"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_user_service_contracts_user_id"`);
    await queryRunner.query(`DROP TABLE "user_service_contracts"`);
  }
}

