import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateComment1727800000000 implements MigrationInterface {
  name = 'AddTemplateComment1727800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "templates" ADD COLUMN "comment" character varying(1000) DEFAULT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "templates" DROP COLUMN "comment"');
  }
}
