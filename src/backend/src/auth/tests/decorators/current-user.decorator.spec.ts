import { CurrentUser } from '../../decorators/current-user.decorator';

describe('CurrentUser Decorator', () => {
  it('should be defined', () => {
    // Basic check that decorator exists and is a function
    expect(CurrentUser).toBeDefined();
    expect(typeof CurrentUser).toBe('function');
  });
}); 