import { ExecutionContext, createParamDecorator } from '@nestjs/common';

/**
 * Current User Decorator
 *
 * @description Extracts the authenticated user from the request
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
