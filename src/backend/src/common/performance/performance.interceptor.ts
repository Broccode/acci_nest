import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceService } from './performance.service';

/**
 * Interceptor for measuring and recording API request performance
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private readonly SAMPLE_RATE = 0.5; // Sample 50% of requests to reduce overhead

  constructor(private readonly performanceService: PerformanceService) {}

  /**
   * Intercepts requests to measure and record performance metrics
   * @param context - Execution context
   * @param next - Call handler
   * @returns Observable with the handler result
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Sample requests to reduce overhead (adjusted based on load)
    if (Math.random() > this.SAMPLE_RATE) {
      return next.handle();
    }

    const start = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();

    // Extract useful information for metrics
    const method = request.method;
    const route = this.normalizeRoute(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    const tenantId = (request as any).tenantId || 'unknown';

    return next.handle().pipe(
      tap({
        next: () => this.recordSuccess(start, method, route, tenantId, userAgent),
        error: (error) => this.recordError(start, method, route, tenantId, userAgent, error),
      })
    );
  }

  /**
   * Records successful request metrics
   * @param start - Start timestamp
   * @param method - HTTP method
   * @param route - Request route
   * @param tenantId - Tenant ID
   * @param userAgent - User agent
   */
  private recordSuccess(
    start: number,
    method: string,
    route: string,
    tenantId: string,
    userAgent: string
  ): void {
    const duration = Date.now() - start;

    try {
      // Record endpoint-specific duration
      this.performanceService.recordMetric(`request.duration.${method}.${route}`, duration, {
        method,
        route,
        tenantId,
        status: 'success',
      });

      // Record overall API response time
      this.performanceService.recordMetric('request.duration.all', duration, {
        method,
        route,
        tenantId,
        status: 'success',
      });

      // Log slow requests for investigation
      if (duration > 1000) {
        this.logger.warn(`Slow request: ${method} ${route} took ${duration}ms`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to record performance metric',
        error instanceof Error ? error.stack : String(error)
      );
      // Non-critical, continue execution
    }
  }

  /**
   * Records failed request metrics
   * @param start - Start timestamp
   * @param method - HTTP method
   * @param route - Request route
   * @param tenantId - Tenant ID
   * @param userAgent - User agent
   * @param error - Error object
   */
  private recordError(
    start: number,
    method: string,
    route: string,
    tenantId: string,
    userAgent: string,
    error: Error
  ): void {
    const duration = Date.now() - start;

    try {
      // Record endpoint-specific error
      this.performanceService.recordMetric(`request.error.${method}.${route}`, duration, {
        method,
        route,
        tenantId,
        status: 'error',
        errorType: error.name,
      });

      // Record overall API error rate
      this.performanceService.recordMetric('request.error.all', duration, {
        method,
        route,
        tenantId,
        status: 'error',
        errorType: error.name,
      });
    } catch (metricError) {
      this.logger.error(
        'Failed to record error metric',
        metricError instanceof Error ? metricError.stack : String(metricError)
      );
      // Non-critical, continue execution
    }
  }

  /**
   * Normalizes route to prevent cardinality explosion
   * Replaces dynamic route parameters with placeholders
   * @param request - HTTP request
   * @returns Normalized route
   */
  private normalizeRoute(request: Request): string {
    if (!request.route) {
      return 'unknown';
    }

    try {
      // Extract base route path from route definition
      const routePath = request.route.path;

      // For NestJS routes, this will give us the pattern like "/users/:id"
      // We keep this format which naturally groups routes with the same pattern
      return routePath;
    } catch (error) {
      this.logger.warn(
        'Failed to normalize route',
        error instanceof Error ? error.stack : String(error)
      );
      return 'unknown';
    }
  }
}
