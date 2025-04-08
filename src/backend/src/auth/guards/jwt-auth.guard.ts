import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Authentication Guard
 *
 * @description Protects routes with JWT authentication, unless marked as public
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determines if the current route can be activated
   *
   * @param context Execution context
   * @returns Boolean indicating if the route can be activated
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route is public, allow access
    if (isPublic) {
      return true;
    }

    // Otherwise, use standard JWT authentication
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      // Throw a standardized UnauthorizedException
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
