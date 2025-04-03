import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Exception for business rule violations
 * Used when an operation would violate a business rule or constraint
 */
export class BusinessRuleException extends DomainException {
  /**
   * Create a new business rule exception
   * @param message - Description of the business rule violation
   * @param ruleCode - Specific code for the business rule that was violated
   * @param context - Additional context information
   */
  constructor(message: string, ruleCode: string, context?: Record<string, unknown>) {
    super(message, `BUSINESS_RULE_${ruleCode}`, HttpStatus.CONFLICT, context);
  }
}
