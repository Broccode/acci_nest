import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  ARCHIVED = 'archived'
}

@Entity({ tableName: 'tenants' })
export class Tenant extends BaseEntity {
  @Property()
  @Unique()
  name: string;

  @Property()
  @Unique()
  domain: string;

  @Enum(() => TenantStatus)
  status: TenantStatus = TenantStatus.TRIAL;

  @Property({ nullable: true })
  plan?: string;

  @Property({ type: 'json', nullable: true })
  features?: Record<string, any>[] = [];

  @Property({ type: 'json', nullable: true })
  configuration?: {
    theme?: Record<string, any>;
    security?: Record<string, any>;
    integrations?: Record<string, any>[];
  } = {};
} 