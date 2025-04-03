import { Migration } from '@mikro-orm/migrations';

export class Migration20250331210742 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "tenants" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "domain" varchar(255) not null, "status" text check ("status" in ('active', 'suspended', 'trial', 'archived')) not null default 'trial', "plan" varchar(255) null, "features" jsonb null, "configuration" jsonb null, constraint "tenants_pkey" primary key ("id"));`
    );
    this.addSql(`alter table "tenants" add constraint "tenants_name_unique" unique ("name");`);
    this.addSql(`alter table "tenants" add constraint "tenants_domain_unique" unique ("domain");`);
  }
}
