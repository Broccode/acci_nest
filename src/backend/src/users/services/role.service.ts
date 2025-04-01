import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CreateRoleDto, UpdateRoleDto } from '../types/user.types';

/**
 * Role Service
 * 
 * @description Manages role and permission operations with tenant isolation
 */
@Injectable()
export class RoleService {
  constructor(
    private readonly em: EntityManager,
  ) {}

  /**
   * Create a new role
   * 
   * @param data Role data
   * @param tenantId Tenant ID
   * @returns Created role
   */
  async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
    const { permissions, ...roleData } = data;
    
    // Check if role exists
    const existingRole = await this.em.findOne(Role, { name: roleData.name, tenantId });
    if (existingRole) {
      throw new Error('Role with this name already exists');
    }

    // Create new role
    const role = this.em.create(Role, {
      ...roleData,
      tenantId,
    });

    await this.em.persistAndFlush(role);

    // Assign permissions if provided
    if (permissions?.length) {
      await this.assignPermissions(role.id, permissions, tenantId);
    }

    return role;
  }

  /**
   * Update an existing role
   * 
   * @param id Role ID
   * @param data Updated role data
   * @param tenantId Tenant ID
   * @returns Updated role
   */
  async updateRole(id: string, data: UpdateRoleDto, tenantId: string): Promise<Role> {
    const role = await this.em.findOneOrFail(Role, { id, tenantId });
    
    // Prevent modification of system roles
    if (role.isSystem) {
      throw new Error('System roles cannot be modified');
    }
    
    this.em.assign(role, data);
    await this.em.flush();
    return role;
  }

  /**
   * Assign permissions to a role
   * 
   * @param roleId Role ID
   * @param permissionIds Permission IDs to assign
   * @param tenantId Tenant ID
   */
  async assignPermissions(roleId: string, permissionIds: string[], tenantId: string): Promise<void> {
    const role = await this.em.findOne(Role, { id: roleId, tenantId }, { populate: ['permissions'] });
    if (!role) {
      throw new Error('Role not found');
    }
    
    // Find permissions
    const permissions = await this.em.find(Permission, { id: { $in: permissionIds } });
    
    // Add permissions to role
    permissions.forEach(permission => role.permissions.add(permission));
    await this.em.flush();
  }

  /**
   * Remove permissions from a role
   * 
   * @param roleId Role ID
   * @param permissionIds Permission IDs to remove
   * @param tenantId Tenant ID
   */
  async removePermissions(roleId: string, permissionIds: string[], tenantId: string): Promise<void> {
    const role = await this.em.findOne(Role, { id: roleId, tenantId }, { populate: ['permissions'] });
    if (!role) {
      throw new Error('Role not found');
    }
    
    // Prevent modification of system roles
    if (role.isSystem) {
      throw new Error('Permissions cannot be removed from system roles');
    }
    
    // Remove specified permissions
    permissionIds.forEach(permissionId => {
      const permission = role.permissions.getItems().find(p => p.id === permissionId);
      if (permission) {
        role.permissions.remove(permission);
      }
    });
    
    await this.em.flush();
  }

  /**
   * Get all roles for a tenant
   * 
   * @param tenantId Tenant ID
   * @returns List of roles
   */
  async getRolesForTenant(tenantId: string): Promise<Role[]> {
    return this.em.find(Role, { tenantId });
  }

  /**
   * Get system roles
   * 
   * @returns List of system roles
   */
  async getSystemRoles(): Promise<Role[]> {
    return this.em.find(Role, { isSystem: true });
  }
} 