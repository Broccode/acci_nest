import { EntityManager, MikroORM } from '@mikro-orm/core';
import { Redis } from 'ioredis';

// Global setup and teardown
let ormInstance: MikroORM | null = null;
// Collection of Redis clients for cleanup
const redisClients: Redis[] = [];

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
  // First close all Redis clients properly
  if (redisClients.length > 0) {
    console.log(`Closing ${redisClients.length} Redis clients...`);
    
    for (const client of redisClients) {
      try {
        if (client && client.status !== 'end') {
          await client.disconnect();
          await new Promise(resolve => setTimeout(resolve, 100));
          await client.quit();
          client.removeAllListeners();
        }
      } catch (error) {
        console.error('Error closing a Redis client:', error);
      }
    }
    
    // Short pause to ensure all Redis connections have time to close
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Empty the array
    redisClients.length = 0;
  }
  
  // Then close ORM if it exists
  if (ormInstance) {
    await ormInstance.close(true);
    ormInstance = null;
  }
  
  // Use a timer with unref() to ensure the process is not blocked
  setTimeout(() => {
    // This timer helps Node.js recognize that the event loop should be empty
  }, 1000).unref();
});

// Attach ORM instance for cleanup
// To be used in test files: setOrmInstance(app.get(MikroORM))
export function setOrmInstance(orm: MikroORM): void {
  ormInstance = orm;
}

// Register Redis clients for cleanup
// In tests use: registerRedisClient(app.get(REDIS_CLIENT))
export function registerRedisClient(client: Redis): void {
  if (client && !redisClients.includes(client)) {
    redisClients.push(client);
  }
}

// Increase timeout for E2E tests as they work with real modules
jest.setTimeout(30000); 