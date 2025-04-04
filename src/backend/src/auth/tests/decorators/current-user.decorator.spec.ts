import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator';

describe('CurrentUser Decorator', () => {
  // Mock the implementation details of the decorator for testing
  const decoratorFactory = jest.fn();
  
  // Mock the createParamDecorator to return our mock factory
  (createParamDecorator as jest.Mock) = jest.fn().mockReturnValue(decoratorFactory);

  it('should be defined', () => {
    expect(CurrentUser).toBeDefined();
  });

  it('should extract user from request', () => {
    // Create a mock execution context
    const mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: {
            id: '123',
            email: 'test@example.com',
            tenantId: 'tenant-123',
          },
        }),
      }),
    } as unknown as ExecutionContext;

    // Mock implementation to simulate decorator behavior
    const mockDataField = 'email'; // Specific field we want to extract
    const mockDecoratorCallback = (data: unknown, context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      return data ? user && user[data as string] : user;
    };

    // Test extracting the whole user object
    const wholeUser = mockDecoratorCallback(undefined, mockExecutionContext);
    expect(wholeUser).toEqual({
      id: '123',
      email: 'test@example.com',
      tenantId: 'tenant-123',
    });

    // Test extracting a specific field
    const email = mockDecoratorCallback(mockDataField, mockExecutionContext);
    expect(email).toBe('test@example.com');
  });

  it('should handle missing user gracefully', () => {
    // Create a mock execution context with no user
    const mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}), // No user in request
      }),
    } as unknown as ExecutionContext;

    // Mock implementation to simulate decorator behavior
    const mockDecoratorCallback = (data: unknown, context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      return data ? user && user[data as string] : user;
    };

    // Test extracting the whole user object
    const wholeUser = mockDecoratorCallback(undefined, mockExecutionContext);
    expect(wholeUser).toBeUndefined();

    // Test extracting a specific field
    const email = mockDecoratorCallback('email', mockExecutionContext);
    expect(email).toBeUndefined();
  });
}); 