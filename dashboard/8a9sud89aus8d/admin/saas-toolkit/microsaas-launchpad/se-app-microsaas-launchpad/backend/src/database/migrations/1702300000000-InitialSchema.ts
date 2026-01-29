import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1702300000000 implements MigrationInterface {
  name = 'InitialSchema1702300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp extension if not exists
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
    `);

    // Create admin_users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying,
        "name" character varying,
        "avatar" character varying,
        "email_verified" boolean NOT NULL DEFAULT false,
        "email_verification_token" character varying,
        "email_verification_expires" TIMESTAMP,
        "password_reset_token" character varying,
        "password_reset_expires" TIMESTAMP,
        "provider" character varying NOT NULL DEFAULT 'email',
        "provider_id" character varying,
        "last_login_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_users" PRIMARY KEY ("id")
      )
    `);

    // Create unique index on email
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_admin_users_email" ON "admin_users" ("email")
    `);

    // Create admin_sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "admin_user_id" uuid NOT NULL,
        "refresh_token" character varying NOT NULL,
        "ip_address" character varying,
        "user_agent" character varying,
        "expires_at" TIMESTAMP NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_sessions" PRIMARY KEY ("id")
      )
    `);

    // Create index on refresh_token
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_sessions_refresh_token" ON "admin_sessions" ("refresh_token")
    `);

    // Create projects table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "owner_id" uuid NOT NULL,
        "allowed_domains" jsonb NOT NULL DEFAULT '[]',
        "settings" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects" PRIMARY KEY ("id")
      )
    `);

    // Create api_keys table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "key_hash" character varying NOT NULL,
        "key_prefix" character varying NOT NULL,
        "last_used_at" TIMESTAMP,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id")
      )
    `);

    // Create index on key_hash
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_api_keys_key_hash" ON "api_keys" ("key_hash")
    `);

    // Add foreign keys
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "admin_sessions"
        ADD CONSTRAINT "FK_admin_sessions_admin_user"
        FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "projects"
        ADD CONSTRAINT "FK_projects_owner"
        FOREIGN KEY ("owner_id") REFERENCES "admin_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "api_keys"
        ADD CONSTRAINT "FK_api_keys_project"
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "api_keys" DROP CONSTRAINT IF EXISTS "FK_api_keys_project"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_owner"`);
    await queryRunner.query(`ALTER TABLE "admin_sessions" DROP CONSTRAINT IF EXISTS "FK_admin_sessions_admin_user"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_api_keys_key_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_sessions_refresh_token"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_users_email"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_users"`);
  }
}
