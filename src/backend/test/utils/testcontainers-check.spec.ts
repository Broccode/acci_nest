import { RedisContainer } from '@testcontainers/redis';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

describe('Testcontainers Functionality Check', () => {
  it('should be able to start and stop a Redis container', async () => {
    console.log('Starting Redis container test...');
    
    const container = new RedisContainer();
    
    try {
      // Start container
      const startedContainer = await container.start();
      
      // Get connection details
      const host = startedContainer.getHost();
      const port = startedContainer.getMappedPort(6379);
      
      console.log(`Redis container started at ${host}:${port}`);
      
      // Basic validation
      expect(host).toBeDefined();
      expect(port).toBeGreaterThan(0);
      
      // Stop container
      await startedContainer.stop();
      console.log('Redis container stopped successfully');
    } catch (error) {
      console.error('Redis container test failed:', error);
      throw error;
    }
  }, 30000); // Allow 30s for container startup
  
  it('should be able to start and stop a PostgreSQL container', async () => {
    console.log('Starting PostgreSQL container test...');
    
    const container = new PostgreSqlContainer();
    
    try {
      // Start container
      const startedContainer = await container.start();
      
      // Get connection details
      const host = startedContainer.getHost();
      const port = startedContainer.getMappedPort(5432);
      const database = startedContainer.getDatabase();
      const username = startedContainer.getUsername();
      const password = startedContainer.getPassword();
      
      console.log(`PostgreSQL container started at ${host}:${port}`);
      console.log(`Database: ${database}, Username: ${username}, Password: ${password}`);
      
      // Basic validation
      expect(host).toBeDefined();
      expect(port).toBeGreaterThan(0);
      expect(database).toBeDefined();
      expect(username).toBeDefined();
      expect(password).toBeDefined();
      
      // Stop container
      await startedContainer.stop();
      console.log('PostgreSQL container stopped successfully');
    } catch (error) {
      console.error('PostgreSQL container test failed:', error);
      throw error;
    }
  }, 30000); // Allow 30s for container startup
}); 