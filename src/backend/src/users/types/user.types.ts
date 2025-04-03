import { UserStatus } from '../entities/user.entity';

/**
 * Create user DTO
 */
export interface CreateUserDto {
  email: string;
  password: string;
  profile: {
    firstName: string;
    lastName: string;
    preferredLanguage?: string;
  };
  roles?: string[];
  status?: UserStatus;
}

/**
 * Update user DTO
 */
export interface UpdateUserDto {
  email?: string;
  password?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    preferredLanguage?: string;
  };
  status?: UserStatus;
}

/**
 * Create role DTO
 */
export interface CreateRoleDto {
  name: string;
  description?: string;
  isSystem?: boolean;
  permissions?: string[];
}

/**
 * Update role DTO
 */
export interface UpdateRoleDto {
  name?: string;
  description?: string;
  isSystem?: boolean;
}

/**
 * Create permission DTO
 */
export interface CreatePermissionDto {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

/**
 * Update permission DTO
 */
export interface UpdatePermissionDto {
  resource?: string;
  action?: string;
  conditions?: Record<string, unknown>;
}
