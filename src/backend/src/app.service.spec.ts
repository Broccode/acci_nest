import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import { AppService } from './app.service';

/**
 * @security OWASP:A9:2021 - Security Logging and Monitoring Failures
 * @evidence SOC2:Security - Testing database connection monitoring
 */
describe('AppService', () => {
  let service: AppService;
  let entityManager: EntityManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: EntityManager,
          useValue: {
            getConnection: jest.fn().mockReturnValue({
              execute: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    entityManager = module.get<EntityManager>(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(service.getHello()).toBe('Hello World!');
    });
  });

  describe('checkDbConnection', () => {
    it('should return true when database is connected', async () => {
      // Arrange
      const connectionMock = entityManager.getConnection();
      jest.spyOn(connectionMock, 'execute').mockResolvedValue([{ '?column?': 1 }]);
      
      // Act
      const result = await service.checkDbConnection();
      
      // Assert
      expect(result).toBe(true);
      expect(connectionMock.execute).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when database connection fails', async () => {
      // Arrange
      const connectionMock = entityManager.getConnection();
      jest.spyOn(connectionMock, 'execute').mockRejectedValue(new Error('Connection failed'));
      
      // Act
      const result = await service.checkDbConnection();
      
      // Assert
      expect(result).toBe(false);
      expect(connectionMock.execute).toHaveBeenCalledWith('SELECT 1');
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return comprehensive health data when database is connected', async () => {
      // Arrange
      const connectionMock = entityManager.getConnection();
      
      // Mock the initial connection check
      jest.spyOn(service, 'checkDbConnection').mockResolvedValue(true);
      
      // Mock version query
      jest.spyOn(connectionMock, 'execute')
        .mockResolvedValueOnce([{ version: 'PostgreSQL 13.4 on x86_64-pc-linux-gnu' }])
        // Mock migrations query
        .mockResolvedValueOnce([{ count: '10' }])
        // Mock stats query
        .mockResolvedValueOnce([{ 
          tables: '15', 
          sequences: '5', 
          schemas: '2' 
        }]);
      
      // Act
      const result = await service.getDatabaseHealth();
      
      // Assert
      expect(result.connected).toBe(true);
      expect(result.version).toBe('PostgreSQL');
      expect(result.migrationStatus.applied).toBe(10);
      expect(result.stats.tables).toBe(15);
      expect(result.stats.sequences).toBe(5);
      expect(result.stats.schemas).toBe(2);
      expect(connectionMock.execute).toHaveBeenCalledTimes(3);
    });

    it('should handle database disconnection', async () => {
      // Arrange
      jest.spyOn(service, 'checkDbConnection').mockResolvedValue(false);
      
      // Act
      const result = await service.getDatabaseHealth();
      
      // Assert
      expect(result.connected).toBe(false);
      expect(result.version).toBe('Unknown');
      expect(result.migrationStatus.applied).toBe(0);
      expect(result.stats.tables).toBe(0);
    });

    it('should handle error in migrations query', async () => {
      // Arrange
      const connectionMock = entityManager.getConnection();
      
      // Mock the initial connection check
      jest.spyOn(service, 'checkDbConnection').mockResolvedValue(true);
      
      // Mock version query
      jest.spyOn(connectionMock, 'execute')
        .mockResolvedValueOnce([{ version: 'PostgreSQL 13.4' }])
        // Mock migrations query failing
        .mockRejectedValueOnce(new Error('Migrations table does not exist'))
        // Mock stats query
        .mockResolvedValueOnce([{ 
          tables: '15', 
          sequences: '5', 
          schemas: '2' 
        }]);
      
      // Act
      const result = await service.getDatabaseHealth();
      
      // Assert
      expect(result.connected).toBe(true);
      expect(result.version).toBe('PostgreSQL');
      expect(result.migrationStatus.applied).toBe(0); // Default when query fails
      expect(result.stats.tables).toBe(15);
    });

    it('should handle error in stats query', async () => {
      // Arrange
      const connectionMock = entityManager.getConnection();
      
      // Mock the initial connection check
      jest.spyOn(service, 'checkDbConnection').mockResolvedValue(true);
      
      // Mock version query
      jest.spyOn(connectionMock, 'execute')
        .mockResolvedValueOnce([{ version: 'PostgreSQL 13.4' }])
        // Mock migrations query
        .mockResolvedValueOnce([{ count: '10' }])
        // Mock stats query failing
        .mockRejectedValueOnce(new Error('Stats query failed'));
      
      // Act
      const result = await service.getDatabaseHealth();
      
      // Assert - Error in stats query should return default stats values but keep other values
      expect(result.connected).toBe(true);
      expect(result.version).toBe('PostgreSQL');
      expect(result.migrationStatus.applied).toBe(10);
      // Stats should be default values
      expect(result.stats.tables).toBe(0);
      expect(result.stats.sequences).toBe(0);
      expect(result.stats.schemas).toBe(0);
    });

    it('should handle unexpected error during health check', async () => {
      // Arrange
      jest.spyOn(service, 'checkDbConnection').mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      // Act
      const result = await service.getDatabaseHealth();
      
      // Assert
      expect(result.connected).toBe(false);
      expect(result.version).toBe('Unknown');
    });
  });
}); 