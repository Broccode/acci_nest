import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Exception for validation failures
 * Used when input data fails validation rules
 */
export class ValidationException extends DomainException {
  /**
   * Create a new validation exception
   * @param errors - Validation errors by field
   * @param context - Additional context information
   */
  constructor(errors: Record<string, string[]>, context?: Record<string, unknown>) {
    super('Validation failed', 'VALIDATION_FAILED', HttpStatus.BAD_REQUEST, {
      ...context,
      validationErrors: errors,
    });

    // Override the response to include 'errors' directly in response
    Object.defineProperty(this, 'response', {
      value: {
        ...(this.getResponse() as Record<string, unknown>),
        errors: errors,
      },
    });
  }
}
