import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Tenant Authentication Guard
 * 
 * @description Guard that validates both JWT and tenant access
 */
@Injectable()
export class TenantAuthGuard extends JwtAuthGuard {
  /**
   * Determine if the request is authorized for the tenant
   * 
   * @param context Execution context
   * @returns Boolean indicating if the request is allowed
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check JWT token validity
    const isJwtValid = await super.canActivate(context);
    if (!isJwtValid) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requestTenantId = 
      request.params.tenantId || 
      request.query.tenantId || 
      request.body.tenantId;

    // If no tenant ID is specified in the request, allow access
    // The tenant will be determined from the user's token
    if (!requestTenantId) {
      return true;
    }

    // Check if the user has access to the specified tenant
    if (user.tenantId !== requestTenantId) {
      throw new UnauthorizedException('You do not have access to this tenant');
    }

    return true;
  }
} 