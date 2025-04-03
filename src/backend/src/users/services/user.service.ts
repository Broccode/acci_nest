import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Role } from '../entities/role.entity';
import { User, UserStatus } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../types/user.types';

/**
 * User Service
 * 
 * @description Manages user operations with tenant isolation
 */
@Injectable()
export class UserService {
  constructor(
    private readonly em: EntityManager,
  ) {}

  /**
   * Create a new user
   * 
   * @param data User data
   * @param tenantId Tenant ID
   * @returns Created user
   */
  async createUser(data: CreateUserDto, tenantId: string): Promise<User> {
    const { password, roles, ...userData } = data;
    
    // Check if user exists
    const existingUser = await this.em.findOne(User, { email: userData.email, tenantId });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Find tenant
    const tenant = await this.em.findOneOrFail(Tenant, { id: tenantId });

    // Create new user
    const user = this.em.create(User, {
      ...userData,
      tenantId,
      tenant, // Set the tenant reference
      password: await this.hashPassword(password),
    });

    await this.em.persistAndFlush(user);

    // Assign roles if provided
    if (roles?.length) {
      await this.assignRoles(user.id, roles, tenantId);
    }

    return user;
  }

  /**
   * Update an existing user
   * 
   * @param id User ID
   * @param data Updated user data
   * @param tenantId Tenant ID
   * @returns Updated user
   */
  async updateUser(id: string, data: UpdateUserDto, tenantId: string): Promise<User> {
    const user = await this.em.findOneOrFail(User, { id, tenantId });
    
    // Hash password if provided
    if (data.password) {
      data.password = await this.hashPassword(data.password);
    }
    
    this.em.assign(user, data);
    await this.em.flush();
    return user;
  }

  /**
   * Assign roles to a user
   * 
   * @param userId User ID
   * @param roleIds Role IDs to assign
   * @param tenantId Tenant ID
   */
  async assignRoles(userId: string, roleIds: string[], tenantId: string): Promise<void> {
    const user = await this.em.findOne(User, { id: userId, tenantId }, { populate: ['roles'] });
    if (!user) {
      throw new Error('User not found');
    }
    
    // Find roles and ensure they belong to the right tenant
    const roles = await this.em.find(Role, { id: { $in: roleIds }, tenantId });
    
    // Add roles to user
    roles.forEach(role => user.roles.add(role));
    await this.em.flush();
  }

  /**
   * Remove roles from a user
   * 
   * @param userId User ID
   * @param roleIds Role IDs to remove
   * @param tenantId Tenant ID
   */
  async removeRoles(userId: string, roleIds: string[], tenantId: string): Promise<void> {
    const user = await this.em.findOne(User, { id: userId, tenantId }, { populate: ['roles'] });
    if (!user) {
      throw new Error('User not found');
    }
    
    // Remove specified roles
    roleIds.forEach(roleId => {
      const role = user.roles.getItems().find(r => r.id === roleId);
      if (role) {
        user.roles.remove(role);
      }
    });
    
    await this.em.flush();
  }

  /**
   * Activate a user
   * 
   * @param id User ID
   * @param tenantId Tenant ID
   * @returns Updated user
   */
  async activateUser(id: string, tenantId: string): Promise<User> {
    const user = await this.em.findOneOrFail(User, { id, tenantId });
    user.status = UserStatus.ACTIVE;
    await this.em.flush();
    return user;
  }

  /**
   * Deactivate a user
   * 
   * @param id User ID
   * @param tenantId Tenant ID
   * @returns Updated user
   */
  async deactivateUser(id: string, tenantId: string): Promise<User> {
    const user = await this.em.findOneOrFail(User, { id, tenantId });
    user.status = UserStatus.INACTIVE;
    await this.em.flush();
    return user;
  }

  /**
   * Hash a password
   * 
   * @param password Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Validate a password
   * 
   * @param plaintext Plain text password
   * @param hashed Hashed password
   * @returns True if password is valid
   */
  async validatePassword(plaintext: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hashed);
  }
} 