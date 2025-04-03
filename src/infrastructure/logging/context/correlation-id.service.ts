import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Service to manage correlation IDs throughout the request lifecycle
 * Uses AsyncLocalStorage to maintain correlation ID across async operations
 */
@Injectable()
export class CorrelationIdService {
  private readonly storage = new AsyncLocalStorage<Map<string, any>>();

  /**
   * Header name for the correlation ID in HTTP requests
   */
  public static readonly HEADER_NAME = 'x-correlation-id';

  /**
   * Get the current correlation ID from the context
   * @returns The current correlation ID or undefined if not set
   */
  getCurrentCorrelationId(): string | undefined {
    const store = this.getStore();
    return store?.get('correlationId');
  }

  /**
   * Set the current correlation ID in the context
   * @param correlationId The correlation ID to set
   */
  setCurrentCorrelationId(correlationId: string): void {
    const store = this.getStore();
    if (store) {
      store.set('correlationId', correlationId);
    }
  }

  /**
   * Run a function within a correlation ID context
   * @param correlationId The correlation ID to use for the context
   * @param callback The function to run within the correlation ID context
   * @returns The result of the callback function
   */
  runWithCorrelationId<T>(correlationId: string, callback: () => T): T {
    const store = new Map<string, any>();
    store.set('correlationId', correlationId);
    return this.storage.run(store, callback);
  }

  /**
   * Generate a new correlation ID
   * @returns A new UUID v4 as correlation ID
   */
  generateCorrelationId(): string {
    return randomUUID();
  }

  /**
   * Get the current store from AsyncLocalStorage
   * @returns The current store or undefined if not within a context
   */
  private getStore(): Map<string, any> | undefined {
    return this.storage.getStore();
  }
}
