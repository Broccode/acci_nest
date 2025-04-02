import { EntityManager, MikroORM } from '@mikro-orm/core';

// Global setup and teardown
let ormInstance: MikroORM | null = null;

// Reset database state between tests
afterEach(async () => {
  if (ormInstance) {
    const em = ormInstance.em.fork();
    await em.flush();
    em.clear();
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (ormInstance) {
    await ormInstance.close(true);
    ormInstance = null;
  }
});

// Attach ORM instance for cleanup
// To be used in test files: setOrmInstance(app.get(MikroORM))
export function setOrmInstance(orm: MikroORM): void {
  ormInstance = orm;
}

// Increase timeout for E2E tests as they work with real modules
jest.setTimeout(30000); 