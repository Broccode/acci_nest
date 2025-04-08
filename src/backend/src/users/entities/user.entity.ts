import {
  Collection,
  Embeddable,
  Embedded,
  Entity,
  EntityRepositoryType,
  Enum,
  Index,
  ManyToMany,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/core';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { UserRepository } from '../repositories/user.repository';
import { Role } from './role.entity';

/**
 * User status enumeration
 *
 * @description Represents the possible states of a user account
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked',
  PENDING = 'pending',
}

/**
 * User profile embedded entity
 *
 * @description Contains the user's personal information, embedded in the User entity
 */
@Embeddable()
export class UserProfile {
  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property({ default: 'en' })
  preferredLanguage = 'en';
}

/**
 * User entity
 *
 * @description Represents a user in the system with authentication and profile data
 * @tenant-aware This entity is tenant-specific and all operations are isolated by tenant
 */
@Entity()
@Index({ properties: ['email', 'tenantId'], options: { unique: true } })
export class User extends BaseEntity {
  [EntityRepositoryType]?: UserRepository;

  @Property()
  @Index()
  email!: string;

  @Property({ hidden: true })
  password!: string;

  @Embedded(() => UserProfile)
  profile!: UserProfile;

  @ManyToOne(() => Tenant, { fieldName: 'tenant_reference_id' })
  tenant!: Tenant;

  @Property()
  tenantId!: string;

  @ManyToMany(
    () => Role,
    (role) => role.users,
    { owner: true }
  )
  roles = new Collection<Role>(this);

  @Property({ nullable: true })
  lastLogin?: Date;

  @Enum(() => UserStatus)
  status: UserStatus = UserStatus.PENDING;

  /**
   * Indicates if multi-factor authentication is enabled for this user
   */
  @Property({ default: false })
  mfaEnabled = false;

  /**
   * MFA secret key (encrypted)
   */
  @Property({ nullable: true, hidden: true })
  mfaSecret?: string;
}
