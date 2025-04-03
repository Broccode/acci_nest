import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import {
  BusinessRuleException,
  DomainException,
  EntityNotFoundException,
  UnauthorizedException,
  ValidationException,
} from '../infrastructure/exceptions';
import { CorrelationIdService, TenantContextService } from '../infrastructure/logging/context';
import { LoggingService } from '../infrastructure/logging/interfaces';
import { LOGGING_SERVICE } from '../infrastructure/logging/logging.module';

/**
 * Example controller to demonstrate logging and exception handling
 */
@Controller('examples/logging')
export class LoggingExampleController {
  private readonly logger: LoggingService;

  constructor(
    @Inject(LOGGING_SERVICE) private readonly loggerService: LoggingService,
    private readonly correlationService: CorrelationIdService,
    private readonly tenantContext: TenantContextService
  ) {
    // Create a child logger with controller context
    this.logger = this.loggerService.createChildLogger({ context: 'LoggingExampleController' });
  }

  /**
   * Test different log levels
   */
  @Get('log-levels')
  logLevels() {
    this.logger.debug('This is a debug message');
    this.logger.info('This is an info message');
    this.logger.warn('This is a warning message');
    this.logger.error('This is an error message');

    try {
      throw new Error('Test error for logging');
    } catch (error) {
      this.logger.error('Caught an error', error as Error);
    }

    return {
      message: 'Logged messages at different levels',
      correlationId: this.correlationService.getCurrentCorrelationId(),
      tenantId: this.tenantContext.getCurrentTenant(),
    };
  }

  /**
   * Test throwing different exceptions
   */
  @Get('exceptions/:type')
  testExceptions(@Param('type') type: string) {
    switch (type) {
      case 'not-found':
        throw new EntityNotFoundException('User', '12345');

      case 'validation':
        throw new ValidationException({
          email: ['Email is required', 'Email format is invalid'],
          password: ['Password must be at least 8 characters long'],
        });

      case 'unauthorized':
        throw new UnauthorizedException('You do not have access to this resource');

      case 'business-rule':
        throw new BusinessRuleException(
          'Cannot delete user with active subscriptions',
          'ACTIVE_SUBSCRIPTIONS'
        );

      case 'generic':
        throw new DomainException('Generic domain error', 'GENERIC_ERROR', undefined, {
          additionalInfo: 'Some context',
        });

      case 'unexpected':
        throw new Error('Unexpected error');

      default:
        return {
          message: 'No exception thrown',
          type,
          correlationId: this.correlationService.getCurrentCorrelationId(),
          tenantId: this.tenantContext.getCurrentTenant(),
        };
    }
  }

  /**
   * Demonstrate tenant-aware logging
   */
  @Get('tenant-aware')
  tenantAwareLogging(@Query('simulate-tenant') simulateTenant?: string) {
    const currentTenant = this.tenantContext.getCurrentTenant();

    // If tenant is already set in context
    if (currentTenant) {
      this.logger.info(`Logging with existing tenant: ${currentTenant}`);
      return { currentTenant };
    }

    // If a tenant was provided in the query, simulate tenant context
    if (simulateTenant) {
      // Example of running a function within a specific tenant context
      return this.tenantContext.runWithTenant(simulateTenant, () => {
        const tenantId = this.tenantContext.getCurrentTenant();
        this.logger.info(`Logging within simulated tenant context: ${tenantId}`);

        return {
          simulatedTenant: tenantId,
          correlationId: this.correlationService.getCurrentCorrelationId(),
        };
      });
    }

    return {
      message: 'No tenant context found',
      correlationId: this.correlationService.getCurrentCorrelationId(),
    };
  }
}
