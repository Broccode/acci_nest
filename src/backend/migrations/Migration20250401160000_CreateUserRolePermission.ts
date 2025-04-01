import { Migration } from '@mikro-orm/migrations';

export class Migration20250401160000_CreateUserRolePermission extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "permissions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resource" VARCHAR(255) NOT NULL,
        "action" VARCHAR(255) NOT NULL,
        "conditions" JSONB NULL,
        PRIMARY KEY ("id")
      );
    `);

    this.addSql(`
      CREATE UNIQUE INDEX "idx_permission_resource_action" ON "permissions" ("resource", "action");
    `);

    this.addSql(`
      CREATE TABLE "roles" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "name" VARCHAR(255) NOT NULL,
        "description" VARCHAR(255) NULL,
        "tenant_id" UUID NOT NULL,
        "is_system" BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk_role_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE UNIQUE INDEX "idx_role_name_tenant" ON "roles" ("name", "tenant_id");
    `);

    this.addSql(`
      CREATE TABLE "users" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "email" VARCHAR(255) NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "profile_first_name" VARCHAR(255) NOT NULL,
        "profile_last_name" VARCHAR(255) NOT NULL,
        "profile_preferred_language" VARCHAR(5) NOT NULL DEFAULT 'en',
        "tenant_id" UUID NOT NULL,
        "last_login" TIMESTAMP NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        PRIMARY KEY ("id"),
        CONSTRAINT "fk_user_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE UNIQUE INDEX "idx_user_email_tenant" ON "users" ("email", "tenant_id");
    `);

    this.addSql(`
      CREATE INDEX "idx_user_email" ON "users" ("email");
    `);

    this.addSql(`
      CREATE TABLE "role_permissions" (
        "role_id" UUID NOT NULL,
        "permission_id" UUID NOT NULL,
        PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE TABLE "user_roles" (
        "user_id" UUID NOT NULL,
        "role_id" UUID NOT NULL,
        PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE
      );
    `);
  }

  async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS "user_roles" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "role_permissions" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "users" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "roles" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "permissions" CASCADE;');
  }
} 