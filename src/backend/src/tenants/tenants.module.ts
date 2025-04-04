import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { TENANT_CONTEXT } from '../common/constants';
import { Tenant } from './entities/tenant.entity';
import { TenantContext } from './services/tenant-context.service';

@Module({
  imports: [
    // Register the Tenant entity with MikroORM
    MikroOrmModule.forFeature([Tenant]),
  ],
  providers: [
    // Provide the TenantContext service
    {
      provide: TENANT_CONTEXT,
      useClass: TenantContext,
    },
  ],
  exports: [
    // Export MikroORM repositories
    MikroOrmModule.forFeature([Tenant]),
    // Export TenantContext for use in other modules
    TENANT_CONTEXT,
  ],
})
export class TenantsModule {}
