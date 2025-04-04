import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if route is public', async () => {
      // Arrange
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(result).toBe(true);
    });

    it('should call super.canActivate if route is not public', async () => {
      // Arrange
      const context = createMockExecutionContext();
      const superCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)), 
        'canActivate'
      ).mockResolvedValue(true);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);
      expect(result).toBe(true);
    });

    it('should handle AuthGuard rejection gracefully', async () => {
      // Arrange
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)), 
        'canActivate'
      ).mockRejectedValue(new Error('Auth failed'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  // Helper function to create a mock execution context
  function createMockExecutionContext(): ExecutionContext {
    const mockContext = {
      getHandler: jest.fn().mockReturnValue({}),
      getClass: jest.fn().mockReturnValue({}),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: {
            id: '123',
            email: 'test@example.com',
            tenantId: 'tenant-123',
          },
        }),
        getResponse: jest.fn().mockReturnValue({}),
      }),
    };

    return mockContext as unknown as ExecutionContext;
  }
}); 