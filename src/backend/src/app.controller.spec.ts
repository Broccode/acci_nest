import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * @security OWASP:A9:2021 - Security Logging and Monitoring Failures
 * @evidence SOC2:Security - Testing health monitoring endpoints
 */
describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: jest.fn().mockReturnValue('Hello Test!'),
            checkDbConnection: jest.fn(),
            getDatabaseHealth: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should return the string from appService', () => {
      // Arrange
      const expectedValue = 'Hello Test!';
      jest.spyOn(appService, 'getHello').mockReturnValue(expectedValue);
      
      // Act
      const result = appController.getHello();
      
      // Assert
      expect(result).toBe(expectedValue);
      expect(appService.getHello).toHaveBeenCalled();
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status when database is connected', async () => {
      // Arrange
      jest.spyOn(appService, 'checkDbConnection').mockResolvedValue(true);
      
      // Act
      const result = await appController.checkHealth();
      
      // Assert
      expect(result.status).toBe('ok');
      expect(result.services.database.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(appService.checkDbConnection).toHaveBeenCalled();
    });

    it('should return error status when database is not connected', async () => {
      // Arrange
      jest.spyOn(appService, 'checkDbConnection').mockResolvedValue(false);
      
      // Act
      const result = await appController.checkHealth();
      
      // Assert
      expect(result.status).toBe('error');
      expect(result.services.database.status).toBe('error');
      expect(result.services.api.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(appService.checkDbConnection).toHaveBeenCalled();
    });
  });

  describe('getDatabaseHealthDetails', () => {
    it('should return detailed health information', async () => {
      // Arrange
      const mockDbHealth = {
        connected: true,
        version: 'PostgreSQL 13.4',
        migrationStatus: { pending: 0, applied: 10 },
        connectionPool: { used: 2, size: 10, waiting: 0 },
        stats: { tables: 15, sequences: 5, schemas: 2 },
      };
      
      jest.spyOn(appService, 'getDatabaseHealth').mockResolvedValue(mockDbHealth);
      
      // Act
      const result = await appController.getDatabaseHealthDetails();
      
      // Assert
      expect(result.status).toBe('ok');
      expect(result.services.database.status).toBe('ok');
      expect(result.services.database.version).toBe(mockDbHealth.version);
      expect(result.services.database.migrations).toEqual(mockDbHealth.migrationStatus);
      expect(result.services.database.pool).toEqual(mockDbHealth.connectionPool);
      expect(result.services.database.stats).toEqual(mockDbHealth.stats);
      expect(result.timestamp).toBeDefined();
      expect(appService.getDatabaseHealth).toHaveBeenCalled();
    });

    it('should handle database disconnection', async () => {
      // Arrange
      const mockDbHealth = {
        connected: false,
        version: 'Unknown',
        migrationStatus: { pending: 0, applied: 0 },
        connectionPool: { used: 0, size: 0, waiting: 0 },
        stats: { tables: 0, sequences: 0, schemas: 0 },
      };
      
      jest.spyOn(appService, 'getDatabaseHealth').mockResolvedValue(mockDbHealth);
      
      // Act
      const result = await appController.getDatabaseHealthDetails();
      
      // Assert
      expect(result.status).toBe('error');
      expect(result.services.database.status).toBe('error');
      expect(result.services.api.status).toBe('ok');
      expect(appService.getDatabaseHealth).toHaveBeenCalled();
    });
  });
}); 