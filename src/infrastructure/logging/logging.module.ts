import {
  DynamicModule,
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  Optional,
  Provider,
  Type,
} from '@nestjs/common';
import { CorrelationIdService, TenantContextService } from './context';
import { LoggingService as LoggingServiceInterface } from './interfaces';
import {
  CorrelationIdMiddleware,
  DefaultTenantResolver,
  TenantContextMiddleware,
  TenantResolver,
} from './middleware';
import { PinoLoggingOptions, PinoLoggingServiceImpl } from './services';

// Token für den LoggingService
export const LOGGING_SERVICE = 'LOGGING_SERVICE';

// Token für den TenantResolver
export const TENANT_RESOLVER = 'TENANT_RESOLVER';

export interface LoggingModuleOptions {
  /**
   * Pino logging configuration
   */
  logging?: PinoLoggingOptions;

  /**
   * Whether to automatically apply correlation ID middleware
   * @default true
   */
  enableCorrelationId?: boolean;

  /**
   * Whether to automatically apply tenant context middleware
   * @default true
   */
  enableTenantContext?: boolean;

  /**
   * Custom tenant resolver implementation
   */
  tenantResolver?: Type<TenantResolver>;
}

const defaultOptions: LoggingModuleOptions = {
  enableCorrelationId: true,
  enableTenantContext: true,
};

/**
 * Module for logging and request context tracking
 * Provides correlation ID tracking, tenant context, and structured logging
 */
@Global()
@Module({})
export class LoggingModule implements NestModule {
  static register(options: LoggingModuleOptions = {}): DynamicModule {
    const moduleOptions = { ...defaultOptions, ...options };

    // Configure providers
    const providers: Provider[] = [
      CorrelationIdService,
      TenantContextService,
      {
        provide: 'PINO_OPTIONS',
        useValue: moduleOptions.logging || {},
      },
      {
        provide: LOGGING_SERVICE,
        useClass: PinoLoggingServiceImpl,
      },
      {
        provide: TENANT_RESOLVER,
        useClass: moduleOptions.tenantResolver || DefaultTenantResolver,
      },
      // Provide the actual instance for injection
      {
        provide: TenantContextMiddleware,
        useFactory: (tenantContext: TenantContextService, tenantResolver: TenantResolver) => {
          return new TenantContextMiddleware(tenantContext, tenantResolver);
        },
        inject: [TenantContextService, TENANT_RESOLVER],
      },
    ];

    return {
      module: LoggingModule,
      providers,
      exports: [LOGGING_SERVICE, CorrelationIdService, TenantContextService, TENANT_RESOLVER],
    };
  }

  constructor(@Optional() private readonly options: LoggingModuleOptions = defaultOptions) {}

  /**
   * Configure middleware for correlation ID and tenant context
   */
  configure(consumer: MiddlewareConsumer): void {
    // Apply correlation ID middleware if enabled
    if (this.options.enableCorrelationId !== false) {
      consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    }

    // Apply tenant context middleware if enabled
    if (this.options.enableTenantContext !== false) {
      consumer.apply(TenantContextMiddleware).forRoutes('*');
    }
  }
}
