import { Migration } from '@mikro-orm/migrations';

export class Migration20250404153810 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "permission" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "resource" varchar(255) not null, "action" varchar(255) not null, "conditions" jsonb null, constraint "permission_pkey" primary key ("id"));`);
    this.addSql(`create index "permission_resource_action_index" on "permission" ("resource", "action");`);

    this.addSql(`create table "role" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "description" varchar(255) null, "tenant_reference_id" uuid not null, "tenant_id" varchar(255) not null, "is_system" boolean not null default false, constraint "role_pkey" primary key ("id"));`);
    this.addSql(`create index "role_name_tenant_id_index" on "role" ("name", "tenant_id");`);

    this.addSql(`create table "role_permissions" ("role_id" uuid not null, "permission_id" uuid not null, constraint "role_permissions_pkey" primary key ("role_id", "permission_id"));`);

    this.addSql(`create table "user" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "email" varchar(255) not null, "password" varchar(255) not null, "profile_first_name" varchar(255) not null, "profile_last_name" varchar(255) not null, "profile_preferred_language" varchar(255) not null default 'en', "tenant_reference_id" uuid not null, "tenant_id" varchar(255) not null, "last_login" timestamptz null, "status" text check ("status" in ('active', 'inactive', 'locked', 'pending')) not null default 'pending', "mfa_enabled" boolean not null default false, "mfa_secret" varchar(255) null, constraint "user_pkey" primary key ("id"));`);
    this.addSql(`create index "user_email_index" on "user" ("email");`);
    this.addSql(`create index "user_email_tenant_id_index" on "user" ("email", "tenant_id");`);

    this.addSql(`create table "user_roles" ("user_id" uuid not null, "role_id" uuid not null, constraint "user_roles_pkey" primary key ("user_id", "role_id"));`);

    this.addSql(`alter table "role" add constraint "role_tenant_reference_id_foreign" foreign key ("tenant_reference_id") references "tenants" ("id") on update cascade;`);

    this.addSql(`alter table "role_permissions" add constraint "role_permissions_role_id_foreign" foreign key ("role_id") references "role" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "role_permissions" add constraint "role_permissions_permission_id_foreign" foreign key ("permission_id") references "permission" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "user" add constraint "user_tenant_reference_id_foreign" foreign key ("tenant_reference_id") references "tenants" ("id") on update cascade;`);

    this.addSql(`alter table "user_roles" add constraint "user_roles_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "user_roles" add constraint "user_roles_role_id_foreign" foreign key ("role_id") references "role" ("id") on update cascade on delete cascade;`);
  }

}
