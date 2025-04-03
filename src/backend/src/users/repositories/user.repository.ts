import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { User } from '../entities/user.entity';

/**
 * User repository
 *
 * @description Repository for the User entity with tenant-aware operations
 */
export class UserRepository extends TenantAwareRepository<User> {
  /**
   * Find a user by email address within a tenant
   *
   * @param email User's email address
   * @param tenantId Tenant ID
   * @returns The user or null if not found
   */
  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.findOne({ email, tenantId });
  }

  /**
   * Find a user with their roles loaded
   *
   * @param id User ID
   * @param tenantId Tenant ID
   * @returns The user with roles or null if not found
   */
  async findWithRoles(id: string, tenantId: string): Promise<User | null> {
    return this.findOne({ id, tenantId }, { populate: ['roles'] });
  }

  /**
   * Update a user's last login timestamp
   *
   * @param id User ID
   * @param tenantId Tenant ID
   */
  async updateLastLogin(id: string, tenantId: string): Promise<void> {
    await this.nativeUpdate({ id, tenantId }, { lastLogin: new Date() });
  }
}
