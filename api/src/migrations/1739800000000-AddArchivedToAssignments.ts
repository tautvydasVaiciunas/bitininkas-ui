import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchivedToAssignments1739800000000 implements MigrationInterface {
  name = 'AddArchivedToAssignments1739800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assignments" ADD "archived" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "archived"`);
  }
}
