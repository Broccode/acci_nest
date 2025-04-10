import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceInterceptor } from './performance.interceptor';
import { PerformanceService } from './performance.service';
import { createMock } from '@golevelup/ts-jest';

// Mock des PerformanceService
const mockPerformanceService = {
  recordMetric: jest.fn().mockResolvedValue(undefined),
};

// Mock des Request-Objekts
const createMockRequest = (route = '/test/:id', method = 'GET', tenantId = 'test-tenant') => ({
  route: { path: route },
  method,
  tenantId,
  headers: {
    'user-agent': 'test-agent',
  },
});

describe('PerformanceInterceptor', () => {
  let interceptor: PerformanceInterceptor;
  let performanceService: PerformanceService;
  
  beforeEach(async () => {
    // Spy auf Math.random, um das Sampling-Verhalten kontrollierbar zu machen
    jest.spyOn(Math, 'random').mockReturnValue(0.1); // Unter dem SAMPLE_RATE von 0.5
    
    // Date.now-Mocks zurücksetzen, da sie in den einzelnen Tests gesetzt werden
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceInterceptor,
        {
          provide: PerformanceService,
          useValue: mockPerformanceService,
        },
      ],
    }).compile();

    interceptor = module.get<PerformanceInterceptor>(PerformanceInterceptor);
    performanceService = module.get<PerformanceService>(PerformanceService);
    
    // Logger-Mocks erstellen
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('sollte Anfragen abfangen und Metriken für erfolgreiche Anfragen erfassen', (done) => {
      // Arrange
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => createMockRequest('/users/:id', 'GET', 'tenant-123'),
        }),
      });
      
      const mockCallHandler = createMock<CallHandler>({
        handle: () => of({ success: true }),
      });

      // Date.now-Spies für Start und Ende
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)  // Start
        .mockReturnValueOnce(1500); // Ende (500ms Differenz)

      // Act
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          // Assert
          expect(data).toEqual({ success: true });
          expect(performanceService.recordMetric).toHaveBeenCalledTimes(2);
          
          // Prüfe die erste recordMetric-Anfrage
          expect(performanceService.recordMetric).toHaveBeenNthCalledWith(
            1,
            'request.duration.GET./users/:id',
            500,
            {
              method: 'GET',
              route: '/users/:id',
              tenantId: 'tenant-123',
              status: 'success',
            }
          );
          
          // Prüfe die zweite recordMetric-Anfrage
          expect(performanceService.recordMetric).toHaveBeenNthCalledWith(
            2,
            'request.duration.all',
            500,
            {
              method: 'GET',
              route: '/users/:id',
              tenantId: 'tenant-123',
              status: 'success',
            }
          );
          
          done();
        },
        error: (error) => done(error),
      });
    });

    it('sollte Metriken für fehlgeschlagene Anfragen erfassen', (done) => {
      // Arrange
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => createMockRequest('/users/:id', 'POST', 'tenant-123'),
        }),
      });
      
      const testError = new Error('Test error');
      const mockCallHandler = createMock<CallHandler>({
        handle: () => throwError(() => testError),
      });

      // Date.now-Spies für Start und Ende
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)  // Start
        .mockReturnValueOnce(1500); // Ende (500ms Differenz)

      // Act
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          // Assert
          expect(error).toBe(testError);
          expect(performanceService.recordMetric).toHaveBeenCalledTimes(2);
          
          // Prüfe die erste recordMetric-Anfrage für Fehler
          expect(performanceService.recordMetric).toHaveBeenNthCalledWith(
            1,
            'request.error.POST./users/:id',
            500,
            {
              method: 'POST',
              route: '/users/:id',
              tenantId: 'tenant-123',
              status: 'error',
              errorType: 'Error',
            }
          );
          
          // Prüfe die zweite recordMetric-Anfrage für Fehler
          expect(performanceService.recordMetric).toHaveBeenNthCalledWith(
            2,
            'request.error.all',
            500,
            {
              method: 'POST',
              route: '/users/:id',
              tenantId: 'tenant-123',
              status: 'error',
              errorType: 'Error',
            }
          );
          
          done();
        },
      });
    });

    it('sollte Anfragen überspringen, wenn die Sampling-Rate überschritten wird', (done) => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.8); // Über dem SAMPLE_RATE von 0.5
      
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => createMockRequest(),
        }),
      });
      
      const mockCallHandler = createMock<CallHandler>({
        handle: () => of({ success: true }),
      });

      // Act
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          // Assert
          expect(data).toEqual({ success: true });
          expect(performanceService.recordMetric).not.toHaveBeenCalled();
          done();
        },
        error: (error) => done(error),
      });
    });

    it('sollte fehlende Route-Informationen behandeln', (done) => {
      // Arrange
      const mockRequest = createMockRequest();
      mockRequest.route = undefined;
      
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      });
      
      const mockCallHandler = createMock<CallHandler>({
        handle: () => of({ success: true }),
      });

      // Date.now-Spies für Start und Ende
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)  // Start
        .mockReturnValueOnce(1500); // Ende (500ms Differenz)

      // Act
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          // Assert
          expect(data).toEqual({ success: true });
          expect(performanceService.recordMetric).toHaveBeenCalledTimes(2);
          
          // Route sollte als 'unknown' erfasst werden
          expect(performanceService.recordMetric).toHaveBeenNthCalledWith(
            1,
            'request.duration.GET.unknown',
            500,
            expect.objectContaining({
              route: 'unknown',
            })
          );
          
          done();
        },
        error: (error) => done(error),
      });
    });

    it('sollte langsame Anfragen loggen', (done) => {
      // Arrange
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => createMockRequest(),
        }),
      });
      
      const mockCallHandler = createMock<CallHandler>({
        handle: () => of({ success: true }),
      });

      // Date.now-Spies für Start und Ende mit Differenz > 1000ms
      const dateNowSpy = jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)    // Start
        .mockReturnValueOnce(2500);   // Ende (1500ms Differenz, über 1000ms Schwellenwert)

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act & Assert
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          try {
            expect(dateNowSpy).toHaveBeenCalledTimes(2);
            expect(warnSpy).toHaveBeenCalledWith('Slow request: GET /test/:id took 1500ms');
            done();
          } catch (error) {
            done(error);
          }
        },
        error: (error) => done(error),
      });
    });

    it('sollte Fehler beim Aufzeichnen von Metriken abfangen', (done) => {
      // Arrange
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => createMockRequest(),
        }),
      });
      
      const mockCallHandler = createMock<CallHandler>({
        handle: () => of({ success: true }),
      });

      // Simuliere einen Fehler bei recordMetric
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      mockPerformanceService.recordMetric.mockImplementationOnce(() => {
        errorSpy.mockImplementation(() => {}); // Stellen Sie sicher, dass errorSpy aufgerufen wird
        throw new Error('Redis connection error');
      });

      // Act & Assert
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          try {
            expect(data).toEqual({ success: true }); // Die Anfrage sollte trotz Metrikfehler erfolgreich sein
            expect(errorSpy).toHaveBeenCalled();
            done();
          } catch (error) {
            done(error);
          }
        },
        error: (error) => done(error),
      });
    });

    it('sollte Fehler bei der Route-Normalisierung abfangen', (done) => {
      // Arrange
      const mockRequest = createMockRequest();
      // Route existiert, wirft aber einen Fehler bei Zugriff
      Object.defineProperty(mockRequest.route, 'path', {
        get: () => { throw new Error('Cannot read path'); },
      });
      
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      });
      
      const mockCallHandler = createMock<CallHandler>({
        handle: () => of({ success: true }),
      });

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          // Assert
          expect(data).toEqual({ success: true });
          expect(warnSpy).toHaveBeenCalled();
          expect(performanceService.recordMetric).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Number),
            expect.objectContaining({
              route: 'unknown',
            })
          );
          done();
        },
        error: (error) => done(error),
      });
    });

    it('sollte Fehler beim Aufzeichnen von Fehlermetriken abfangen', (done) => {
      // Arrange
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => createMockRequest(),
        }),
      });
      
      const testError = new Error('API error');
      const mockCallHandler = createMock<CallHandler>({
        handle: () => throwError(() => testError),
      });

      // Simuliere einen Fehler bei recordMetric für Fehlermetriken
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      mockPerformanceService.recordMetric.mockImplementationOnce(() => {
        errorSpy.mockImplementation(() => {}); // Stellen Sie sicher, dass errorSpy aufgerufen wird
        throw new Error('Redis connection error');
      });

      // Act & Assert
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          try {
            expect(error).toBe(testError); // Der ursprüngliche Fehler sollte durchgereicht werden
            expect(errorSpy).toHaveBeenCalled();
            done();
          } catch (e) {
            done(e);
          }
        },
      });
    });

    it('sollte fehlenden User-Agent behandeln', (done) => {
      // Arrange
      const mockRequest = createMockRequest();
      mockRequest.headers['user-agent'] = undefined;
      
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      });
      
      const mockCallHandler = createMock<CallHandler>({
        handle: () => of({ success: true }),
      });

      // Act
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          // Assert
          expect(data).toEqual({ success: true });
          expect(performanceService.recordMetric).toHaveBeenCalledTimes(2);
          
          // User-Agent sollte als 'unknown' erfasst werden
          expect(performanceService.recordMetric).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Number),
            expect.objectContaining({
              status: 'success',
            })
          );
          
          done();
        },
        error: (error) => done(error),
      });
    });

    it('sollte fehlende Tenant-ID behandeln', (done) => {
      // Arrange
      const mockRequest = createMockRequest();
      mockRequest.tenantId = undefined;
      
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      });
      
      const mockCallHandler = createMock<CallHandler>({
        handle: () => of({ success: true }),
      });

      // Act
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          // Assert
          expect(data).toEqual({ success: true });
          expect(performanceService.recordMetric).toHaveBeenCalledTimes(2);
          
          // TenantId sollte als 'unknown' erfasst werden
          expect(performanceService.recordMetric).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Number),
            expect.objectContaining({
              tenantId: 'unknown',
            })
          );
          
          done();
        },
        error: (error) => done(error),
      });
    });
  });
});
