import { Entity, EntityRepositoryType as ERT, Enum, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../common/entities/base.entity';
import { TenantRepository } from '../repositories/tenant.repository';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  ARCHIVED = 'archived',
}

@Entity({ tableName: 'tenants', repository: () => TenantRepository })
export class Tenant extends BaseEntity {
  // Type hint for repository in em.getRepository()
  [ERT]?: TenantRepository;

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
  features?: Record<string, unknown>[] = [];

  @Property({ type: 'json', nullable: true })
  configuration?: {
    theme?: Record<string, unknown>;
    security?: Record<string, unknown>;
    integrations?: Record<string, unknown>[];
  } = {};
}
