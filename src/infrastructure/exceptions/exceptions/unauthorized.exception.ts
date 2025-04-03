import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Exception for unauthorized access attempts
 * Used when a user attempts to access a resource they don't have permission for
 */
export class UnauthorizedException extends DomainException {
  /**
   * Create a new unauthorized exception
   * @param message - Custom message for the unauthorized exception
   * @param context - Additional context information
   */
  constructor(message = 'Unauthorized access', context?: Record<string, any>) {
    super(message, 'UNAUTHORIZED', HttpStatus.UNAUTHORIZED, context);
  }
}
