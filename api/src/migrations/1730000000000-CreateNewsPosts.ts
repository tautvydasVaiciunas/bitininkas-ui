import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNewsPosts1730000000000 implements MigrationInterface {
  name = 'CreateNewsPosts1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "news_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "body" text NOT NULL,
        "image_url" character varying(1024),
        "target_all" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_news_posts_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_news_posts_created_at" ON "news_posts" ("created_at" DESC)',
    );

    await queryRunner.query(
      'CREATE INDEX "IDX_news_posts_target_all" ON "news_posts" ("target_all")',
    );

    await queryRunner.query(`
      CREATE TABLE "news_post_groups" (
        "post_id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        CONSTRAINT "PK_news_post_groups" PRIMARY KEY ("post_id", "group_id"),
        CONSTRAINT "FK_news_post_groups_post" FOREIGN KEY ("post_id") REFERENCES "news_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_news_post_groups_group" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_news_post_groups_group" ON "news_post_groups" ("group_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_news_post_groups_post" ON "news_post_groups" ("post_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_news_post_groups_post"');
    await queryRunner.query('DROP INDEX "IDX_news_post_groups_group"');
    await queryRunner.query('DROP TABLE "news_post_groups"');
    await queryRunner.query('DROP INDEX "IDX_news_posts_target_all"');
    await queryRunner.query('DROP INDEX "IDX_news_posts_created_at"');
    await queryRunner.query('DROP TABLE "news_posts"');
  }
}
