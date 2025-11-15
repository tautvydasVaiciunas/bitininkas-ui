import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportChatTables1736000000000 implements MigrationInterface {
  name = 'CreateSupportChatTables1736000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "support_threads" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "last_message_at" TIMESTAMP WITH TIME ZONE,
        "status" character varying(32) NOT NULL DEFAULT 'open',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_support_threads_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "support_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "thread_id" uuid NOT NULL,
        "sender_user_id" uuid,
        "sender_role" character varying(32) NOT NULL,
        "text" text,
        "has_attachments" boolean NOT NULL DEFAULT false,
        "read_by_user" boolean NOT NULL DEFAULT false,
        "read_by_staff" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_support_messages_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "support_attachments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "message_id" uuid NOT NULL,
        "url" character varying(1024) NOT NULL,
        "mime_type" character varying(128) NOT NULL,
        "size_bytes" integer NOT NULL,
        "kind" character varying(32) NOT NULL,
        CONSTRAINT "PK_support_attachments_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "support_threads"
      ADD CONSTRAINT "FK_support_threads_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "support_messages"
      ADD CONSTRAINT "FK_support_messages_thread_id" FOREIGN KEY ("thread_id") REFERENCES "support_threads"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "support_attachments"
      ADD CONSTRAINT "FK_support_attachments_message_id" FOREIGN KEY ("message_id") REFERENCES "support_messages"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "support_attachments" DROP CONSTRAINT "FK_support_attachments_message_id";`);
    await queryRunner.query(`ALTER TABLE "support_messages" DROP CONSTRAINT "FK_support_messages_thread_id";`);
    await queryRunner.query(`ALTER TABLE "support_threads" DROP CONSTRAINT "FK_support_threads_user_id";`);
    await queryRunner.query(`DROP TABLE "support_attachments";`);
    await queryRunner.query(`DROP TABLE "support_messages";`);
    await queryRunner.query(`DROP TABLE "support_threads";`);
  }
}
