import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { Role } from '../entities/role.entity';

/**
 * Role repository
 * 
 * @description Repository for the Role entity with tenant-aware operations
 */
export class RoleRepository extends TenantAwareRepository<Role> {
  /**
   * Find a role by name within a tenant
   * 
   * @param name Role name
   * @param tenantId Tenant ID
   * @returns The role or null if not found
   */
  async findByName(name: string, tenantId: string): Promise<Role | null> {
    return this.findOne({ name, tenantId });
  }

  /**
   * Find system roles (not tenant-specific)
   * 
   * @returns List of system roles
   */
  async findSystemRoles(): Promise<Role[]> {
    return this.find({ isSystem: true });
  }

  /**
   * Find a role with its permissions loaded
   * 
   * @param id Role ID
   * @param tenantId Tenant ID
   * @returns The role with permissions or null if not found
   */
  async findWithPermissions(id: string, tenantId: string): Promise<Role | null> {
    return this.findOne({ id, tenantId }, { populate: ['permissions'] });
  }
} 