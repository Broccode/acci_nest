import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContextService } from '../context';

/**
 * Interface for tenant resolver strategies
 */
export interface TenantResolver {
  /**
   * Resolve the tenant ID from the request
   * @param req The HTTP request
   * @returns The resolved tenant ID or undefined
   */
  resolveTenant(req: Request): string | undefined;
}

/**
 * Default tenant resolver that extracts tenant ID from custom header
 */
@Injectable()
export class DefaultTenantResolver implements TenantResolver {
  public static readonly TENANT_HEADER = 'x-tenant-id';

  /**
   * Resolve tenant ID from the x-tenant-id header
   */
  resolveTenant(req: Request): string | undefined {
    return req.headers[DefaultTenantResolver.TENANT_HEADER] as string | undefined;
  }
}

/**
 * Middleware to extract and manage tenant context throughout the request lifecycle
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly tenantResolver: TenantResolver
  ) {}

  /**
   * Process the incoming request to extract and set the tenant context
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Resolve tenant ID from the request
    const tenantId = this.tenantResolver.resolveTenant(req);

    if (tenantId) {
      // Add tenant ID to request object for easy access
      (req as any).tenantId = tenantId;

      // Run the next middleware in a tenant context
      this.tenantContext.runWithTenant(tenantId, () => {
        next();
      });
    } else {
      // No tenant ID found, continue without setting tenant context
      next();
    }
  }
}
