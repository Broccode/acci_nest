import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { PermissionRepository } from './repositories/permission.repository';
import { RoleRepository } from './repositories/role.repository';
import { UserRepository } from './repositories/user.repository';
import { RoleService } from './services/role.service';
import { UserService } from './services/user.service';

/**
 * Users Module
 *
 * @description Handles user management, roles, and permissions
 */
@Module({
  imports: [MikroOrmModule.forFeature([User, Role, Permission])],
  providers: [
    // Services
    UserService,
    RoleService,
  ],
  exports: [UserService, RoleService, MikroOrmModule],
})
export class UsersModule {}
