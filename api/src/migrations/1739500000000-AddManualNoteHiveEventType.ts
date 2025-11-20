import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManualNoteHiveEventType1739500000000 implements MigrationInterface {
  name = 'AddManualNoteHiveEventType1739500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."hive_events_type_enum" ADD VALUE IF NOT EXISTS 'MANUAL_NOTE'`,
    );
  }

  public async down(): Promise<void> {
    // Removal of enum values is not supported; no-op.
  }
}
