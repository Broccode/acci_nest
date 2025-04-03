import { BaseRepository } from '../../common/repositories/base.repository';
import { Permission } from '../entities/permission.entity';

/**
 * Permission repository
 *
 * @description Repository for the Permission entity (not tenant-aware as permissions are global)
 */
export class PermissionRepository extends BaseRepository<Permission> {
  /**
   * Find a permission by resource and action
   *
   * @param resource Resource name (e.g., 'users')
   * @param action Action name (e.g., 'create')
   * @returns The permission or null if not found
   */
  async findByResourceAndAction(resource: string, action: string): Promise<Permission | null> {
    return this.findOne({ resource, action });
  }

  /**
   * Find all permissions for a specific role
   *
   * @param roleId Role ID
   * @returns List of permissions assigned to the role
   */
  async findForRole(roleId: string): Promise<Permission[]> {
    return this.find({ roles: { id: roleId } });
  }
}
