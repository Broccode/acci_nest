import { Entity, Property, ManyToMany, Collection, Index, EntityRepositoryType } from '@mikro-orm/core';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from './role.entity';
import { PermissionRepository } from '../repositories/permission.repository';

/**
 * Permission entity
 * 
 * @description Represents a permission in the system that can be assigned to roles
 * @global Permissions are global and not tenant-specific
 */
@Entity()
@Index({ properties: ['resource', 'action'], options: { unique: true } })
export class Permission extends BaseEntity {
  // Type hint for repository in em.getRepository()
  [EntityRepositoryType]?: PermissionRepository;

  @Property()
  resource!: string;

  @Property()
  action!: string;

  @Property({ type: 'json', nullable: true })
  conditions?: Record<string, any>;

  @ManyToMany(() => Role, role => role.permissions, { mappedBy: 'permissions' })
  roles = new Collection<Role>(this);
} 