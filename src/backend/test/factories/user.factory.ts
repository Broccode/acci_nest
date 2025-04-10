import { Collection } from '@mikro-orm/core';
import { User } from '../../src/users/entities/user.entity';
import { Role } from '../../src/users/entities/role.entity';

type UserOptions = {
  id?: string;
  email?: string;
  password?: string;
  tenantId?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  roles?: Role[];
  status?: string;
};

/**
 * Creates test user objects with default values
 * @security OWASP:A2:2021 - Creates secure test objects
 */
export class UserFactory {
  static create(options: UserOptions = {}): User {
    const roles = new Collection<Role>(null, options.roles || []);
    
    const user = {
      id: options.id || 'user-123',
      email: options.email || 'test@example.com',
      password: options.password || '$2a$10$JdyK5oUduNP1lAhXrJGcXeu1mLUXIpRhO64PbP5L3mW98Owt6NO4C', // hashed 'password123'
      tenantId: options.tenantId || 'tenant-123',
      mfaEnabled: options.mfaEnabled !== undefined ? options.mfaEnabled : false,
      mfaSecret: options.mfaSecret !== undefined ? options.mfaSecret : null,
      roles: {
        getItems: () => roles.getItems(),
        add: (role: Role) => roles.add(role),
        remove: (role: Role) => roles.remove(role),
        contains: (role: Role) => roles.contains(role),
      },
      status: options.status || 'ACTIVE',
    } as unknown as User;
    
    return user;
  }
  
  static createAdmin(options: UserOptions = {}): User {
    const adminRole = { id: 'role-1', name: 'admin' } as Role;
    return UserFactory.create({
      ...options,
      roles: [adminRole, ...(options.roles || [])],
    });
  }
} 