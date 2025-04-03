import { Injectable, NotFoundException, Scope } from '@nestjs/common';

/**
 * Service to manage the current tenant context
 * This service is request-scoped to ensure tenant isolation
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private currentTenantId: string | null = null;

  /**
   * Set the current tenant ID for this request
   */
  setCurrentTenant(tenantId: string): void {
    this.currentTenantId = tenantId;
  }

  /**
   * Get the current tenant ID for this request
   * @throws NotFoundException if no tenant is set
   */
  getCurrentTenant(): string {
    if (!this.currentTenantId) {
      throw new NotFoundException('No tenant found in the current context');
    }
    return this.currentTenantId;
  }

  /**
   * Get the current tenant ID or return the default if none is set
   * @param defaultTenantId The default tenant ID to return if no tenant is set
   */
  getCurrentTenantOrDefault(defaultTenantId: string): string {
    return this.currentTenantId || defaultTenantId;
  }

  /**
   * Check if a tenant is set in the current context
   */
  hasTenant(): boolean {
    return !!this.currentTenantId;
  }

  /**
   * Clear the current tenant ID
   */
  clearCurrentTenant(): void {
    this.currentTenantId = null;
  }
}
