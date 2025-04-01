import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Service to manage tenant context throughout the request lifecycle
 * Uses AsyncLocalStorage to maintain tenant context across async operations
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<Map<string, any>>();

  /**
   * Get the current tenant ID from the context
   * @returns The current tenant ID or undefined if not set
   */
  getCurrentTenant(): string | undefined {
    const store = this.getStore();
    return store?.get('tenantId');
  }

  /**
   * Set the current tenant ID in the context
   * @param tenantId The tenant ID to set
   */
  setCurrentTenant(tenantId: string): void {
    const store = this.getStore();
    if (store) {
      store.set('tenantId', tenantId);
    }
  }

  /**
   * Run a function within a tenant context
   * @param tenantId The tenant ID to use for the context
   * @param callback The function to run within the tenant context
   * @returns The result of the callback function
   */
  runWithTenant<T>(tenantId: string, callback: () => T): T {
    const store = new Map<string, any>();
    store.set('tenantId', tenantId);
    return this.storage.run(store, callback);
  }

  /**
   * Get the current store from AsyncLocalStorage
   * @returns The current store or undefined if not within a context
   */
  private getStore(): Map<string, any> | undefined {
    return this.storage.getStore();
  }
} 