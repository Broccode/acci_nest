import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { UserService } from './services/user.service';
import { RoleService } from './services/role.service';

/**
 * Users Module
 * 
 * @description Handles user management, roles, and permissions
 */
@Module({
  imports: [
    MikroOrmModule.forFeature([User, Role, Permission]),
  ],
  providers: [
    // Services
    UserService,
    RoleService,
  ],
  exports: [
    UserService,
    RoleService,
    MikroOrmModule,
  ],
})
export class UsersModule {}
