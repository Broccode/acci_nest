import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceService, MetricsTimeRange } from './performance.service';
import { REDIS_CLIENT } from '../constants';
import { Logger } from '@nestjs/common';

// Mock für Redis
const mockRedis = {
  pipeline: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  zremrangebyrank: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
  zrangebyscore: jest.fn(),
};

describe('PerformanceService', () => {
  let service: PerformanceService;
  let redis: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.pipeline.mockReturnThis();
    mockRedis.zadd.mockReturnThis();
    mockRedis.zremrangebyrank.mockReturnThis();
    mockRedis.expire.mockReturnThis();
    mockRedis.exec.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
    redis = module.get(REDIS_CLIENT);

    // Mock Logger
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  describe('recordMetric', () => {
    it('sollte Metriken erfolgreich aufzeichnen', async () => {
      // Arrange
      const metricName = 'test.metric';
      const value = 123;
      const tags = { tag1: 'value1', tag2: 'value2' };
      
      // Mock für Date.now()
      const mockNow = 1609459200000; // 2021-01-01
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      // Act
      await service.recordMetric(metricName, value, tags);

      // Assert
      expect(redis.pipeline).toHaveBeenCalled();
      expect(redis.zadd).toHaveBeenCalledWith(
        'metrics:test.metric',
        mockNow,
        expect.any(String)
      );
      
      // Überprüfe, ob das korrekte JSON gespeichert wurde
      const jsonArg = redis.zadd.mock.calls[0][2];
      const parsedJson = JSON.parse(jsonArg);
      expect(parsedJson).toEqual({
        timestamp: mockNow,
        value: 123,
        tags: { tag1: 'value1', tag2: 'value2' },
      });
      
      expect(redis.zremrangebyrank).toHaveBeenCalled();
      expect(redis.expire).toHaveBeenCalled();
      expect(redis.exec).toHaveBeenCalled();
    });

    it('sollte Fehler bei der Aufzeichnung abfangen', async () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      redis.exec.mockRejectedValueOnce(new Error('Redis connection error'));

      // Act
      await service.recordMetric('test.metric', 123);

      // Assert
      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.calls[0][0]).toContain('Failed to record metric: test.metric');
    });

    it('sollte mit leeren Tags zurechtkommen', async () => {
      // Act
      await service.recordMetric('test.metric', 123);

      // Assert
      expect(redis.zadd).toHaveBeenCalledWith(
        'metrics:test.metric',
        expect.any(Number),
        expect.stringContaining('"tags":{}')
      );
    });

    it('sollte bei leerem Metriknamen eine Warnung ausgeben', async () => {
      // Arrange
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      await service.recordMetric('', 123);

      // Assert
      expect(warnSpy).toHaveBeenCalledWith('Attempted to record metric with empty name');
      expect(redis.pipeline).not.toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('sollte Metriken für einen bestimmten Zeitraum abrufen', async () => {
      // Arrange
      const mockNow = 1609459200000; // 2021-01-01
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      const mockResults = [
        JSON.stringify({
          timestamp: mockNow - 1000,
          value: 100,
          tags: { status: 'success' },
        }),
        JSON.stringify({
          timestamp: mockNow - 2000,
          value: 200,
          tags: { status: 'error' },
        }),
      ];
      
      redis.zrangebyscore.mockResolvedValueOnce(mockResults);

      // Act
      const result = await service.getMetrics('test.metric', MetricsTimeRange.MINUTE);

      // Assert
      expect(redis.zrangebyscore).toHaveBeenCalledWith(
        'metrics:test.metric',
        mockNow - 60 * 1000, // 1 minute ago
        mockNow
      );
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        timestamp: mockNow - 1000,
        value: 100,
        tags: { status: 'success' },
      });
      expect(result[1]).toEqual({
        timestamp: mockNow - 2000,
        value: 200,
        tags: { status: 'error' },
      });
    });

    it('sollte ein leeres Array bei leerem Metriknamen zurückgeben', async () => {
      // Act
      const result = await service.getMetrics('', MetricsTimeRange.MINUTE);

      // Assert
      expect(result).toEqual([]);
      expect(redis.zrangebyscore).not.toHaveBeenCalled();
    });

    it('sollte ungültige JSON-Werte filtern', async () => {
      // Arrange
      const mockResults = [
        JSON.stringify({ timestamp: 1000, value: 100, tags: {} }),
        'invalid-json',
        JSON.stringify({ timestamp: 2000, value: 200, tags: {} }),
      ];
      
      redis.zrangebyscore.mockResolvedValueOnce(mockResults);

      // Act
      const result = await service.getMetrics('test.metric', MetricsTimeRange.MINUTE);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ timestamp: 1000, value: 100, tags: {} });
      expect(result[1]).toEqual({ timestamp: 2000, value: 200, tags: {} });
    });

    it('sollte Redis-Fehler abfangen', async () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      redis.zrangebyscore.mockRejectedValueOnce(new Error('Redis connection error'));

      // Act
      const result = await service.getMetrics('test.metric', MetricsTimeRange.MINUTE);

      // Assert
      expect(result).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.calls[0][0]).toContain('Failed to get metrics: test.metric');
    });
  });

  describe('getAverageMetric', () => {
    it('sollte den Durchschnittswert der Metriken berechnen', async () => {
      // Arrange
      jest.spyOn(service, 'getMetrics').mockResolvedValueOnce([
        { timestamp: 1000, value: 100, tags: {} },
        { timestamp: 2000, value: 200, tags: {} },
        { timestamp: 3000, value: 300, tags: {} },
      ]);

      // Act
      const result = await service.getAverageMetric('test.metric', MetricsTimeRange.MINUTE);

      // Assert
      expect(result).toBe(200); // (100 + 200 + 300) / 3
      expect(service.getMetrics).toHaveBeenCalledWith('test.metric', MetricsTimeRange.MINUTE);
    });

    it('sollte null zurückgeben, wenn keine Metriken gefunden wurden', async () => {
      // Arrange
      jest.spyOn(service, 'getMetrics').mockResolvedValueOnce([]);

      // Act
      const result = await service.getAverageMetric('test.metric', MetricsTimeRange.MINUTE);

      // Assert
      expect(result).toBeNull();
    });

    it('sollte mit verschiedenen Zeiträumen funktionieren', async () => {
      // Arrange
      jest.spyOn(service, 'getMetrics').mockResolvedValueOnce([
        { timestamp: 1000, value: 100, tags: {} },
        { timestamp: 2000, value: 300, tags: {} },
      ]);

      // Act
      const result = await service.getAverageMetric('test.metric', MetricsTimeRange.HOUR);

      // Assert
      expect(result).toBe(200);
      expect(service.getMetrics).toHaveBeenCalledWith('test.metric', MetricsTimeRange.HOUR);
    });
  });

  describe('buildMetricKey', () => {
    it('sollte einen korrekt formatierten Metrik-Schlüssel erstellen', async () => {
      // Die Methode ist privat, daher testen wir sie indirekt über recordMetric
      await service.recordMetric('test.metric', 123);
      
      expect(redis.zadd).toHaveBeenCalledWith(
        'metrics:test.metric',
        expect.any(Number),
        expect.any(String)
      );
    });
  });
}); 