/**
 * Context information to enrich log entries
 */
export interface LogContext {
  /** Correlation ID for request tracking */
  correlationId?: string;
  /** Tenant ID for multi-tenancy support */
  tenantId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Additional context details */
  [key: string]: unknown;
}
