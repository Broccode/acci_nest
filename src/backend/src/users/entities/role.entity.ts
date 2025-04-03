import {
  Collection,
  Entity,
  EntityRepositoryType,
  Index,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { RoleRepository } from '../repositories/role.repository';
import { Permission } from './permission.entity';
import { User } from './user.entity';

/**
 * Role entity
 *
 * @description Represents a role in the system, which can be assigned to users
 * @tenant-aware This entity is tenant-specific and all operations are isolated by tenant
 */
@Entity()
@Index({ properties: ['name', 'tenantId'], options: { unique: true } })
export class Role extends BaseEntity {
  // Type hint for repository in em.getRepository()
  [EntityRepositoryType]?: RoleRepository;

  @Property()
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @ManyToOne(() => Tenant, { fieldName: 'tenant_reference_id' })
  tenant!: Tenant;

  @Property()
  tenantId!: string;

  @Property({ default: false })
  isSystem = false;

  @ManyToMany(
    () => Permission,
    (permission) => permission.roles,
    { owner: true }
  )
  permissions = new Collection<Permission>(this);

  @ManyToMany(
    () => User,
    (user) => user.roles,
    { mappedBy: 'roles' }
  )
  users = new Collection<User>(this);
}
