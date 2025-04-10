import { ConditionalRequestMiddleware } from './conditional-request.middleware';
import { NextFunction, Request, Response } from 'express';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

// Mock crypto
jest.mock('crypto', () => {
  return {
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-hash'),
    }),
  };
});

describe('ConditionalRequestMiddleware', () => {
  let middleware: ConditionalRequestMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let originalEnd: jest.Mock;
  let originalWrite: jest.Mock;

  beforeEach(() => {
    // Mock Logger
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    
    // Create middleware instance
    middleware = new ConditionalRequestMiddleware();

    // Setup mocks
    originalEnd = jest.fn();
    originalWrite = jest.fn().mockReturnValue(true);

    mockResponse = {
      end: originalEnd,
      write: originalWrite,
      setHeader: jest.fn(),
      statusCode: 200,
    };

    mockNext = jest.fn() as NextFunction;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('sollte für nicht-GET und nicht-HEAD Anfragen direkt next() aufrufen', () => {
      // Arrange
      mockRequest = { method: 'POST' };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.write).toBe(originalWrite); // write sollte nicht überschrieben werden
      expect(mockResponse.end).toBe(originalEnd); // end sollte nicht überschrieben werden
    });

    it('sollte für GET-Anfragen write und end überschreiben', () => {
      // Arrange
      mockRequest = { method: 'GET', headers: {} };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.write).not.toBe(originalWrite); // write sollte überschrieben werden
      expect(mockResponse.end).not.toBe(originalEnd); // end sollte überschrieben werden
    });

    it('sollte für HEAD-Anfragen write und end überschreiben', () => {
      // Arrange
      mockRequest = { method: 'HEAD', headers: {} };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.write).not.toBe(originalWrite); // write sollte überschrieben werden
      expect(mockResponse.end).not.toBe(originalEnd); // end sollte überschrieben werden
    });

    it('sollte das überschriebene write Daten sammeln', () => {
      // Arrange
      mockRequest = { method: 'GET', headers: {}, url: '/test' };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Simulate response data
      mockResponse.write!('Test Data');
      mockResponse.end!();

      // Assert
      expect(originalWrite).toHaveBeenCalledWith('Test Data');
      expect(originalEnd).toHaveBeenCalled();
    });

    it('sollte ETag und Last-Modified Header hinzufügen', () => {
      // Arrange
      mockRequest = { method: 'GET', headers: {}, url: '/test' };
      
      // Mocked date for consistent testing
      jest.spyOn(Date.prototype, 'toUTCString').mockReturnValue('mocked-date');
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!('Response Data');

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('ETag', 'W/"mocked-hash"');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Last-Modified', 'mocked-date');
    });

    it('sollte 304 Not Modified für matching ETag zurückgeben', () => {
      // Arrange
      mockRequest = { 
        method: 'GET', 
        url: '/test',
        headers: {
          'if-none-match': 'W/"mocked-hash"'
        } 
      };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!('Response Data');

      // Assert
      expect(mockResponse.statusCode).toBe(304);
      expect(originalEnd).toHaveBeenCalledWith(null, 'utf-8');
    });

    it('sollte 304 Not Modified für matching If-Modified-Since zurückgeben', () => {
      // Arrange
      const lastModifiedDate = 'mocked-date';
      jest.spyOn(Date.prototype, 'toUTCString').mockReturnValue(lastModifiedDate);
      
      mockRequest = { 
        method: 'GET', 
        url: '/test',
        headers: {
          'if-modified-since': lastModifiedDate
        } 
      };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!('Response Data');

      // Assert
      expect(mockResponse.statusCode).toBe(304);
      expect(originalEnd).toHaveBeenCalledWith(null, 'utf-8');
    });

    it('sollte nicht-200 Statuscode ignorieren', () => {
      // Arrange
      mockRequest = { method: 'GET', headers: {}, url: '/test' };
      mockResponse.statusCode = 404;
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!('Not Found');

      // Assert
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockResponse.statusCode).toBe(404);
    });

    it('sollte Fehler beim ETag-Generieren abfangen', () => {
      // Arrange
      mockRequest = { method: 'GET', headers: {}, url: '/test' };
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      
      // Simuliere Fehler in der Digest-Methode
      ((crypto.createHash('md5').update('').digest as unknown) as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Digest error');
      });
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!('Response Data');

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        'Error in conditional request middleware',
        expect.stringContaining('Digest error')
      );
      expect(originalEnd).toHaveBeenCalled();
    });

    it('sollte mit leeren Chunks in write umgehen können', () => {
      // Arrange
      mockRequest = { method: 'GET', headers: {}, url: '/test' };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.write!(null);
      mockResponse.write!(undefined);
      mockResponse.end!();

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('ETag', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Last-Modified', expect.any(String));
    });

    it('sollte mit leeren Chunks in end umgehen können', () => {
      // Arrange
      mockRequest = { method: 'GET', headers: {}, url: '/test' };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!(null);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('ETag', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Last-Modified', expect.any(String));
    });

    it('sollte mit Buffer-Chunks umgehen können', () => {
      // Arrange
      mockRequest = { method: 'GET', headers: {}, url: '/test' };
      const buffer = Buffer.from('Test Buffer Data');
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.write!(buffer);
      mockResponse.end!();

      // Assert
      expect(originalWrite).toHaveBeenCalledWith(buffer);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('ETag', expect.any(String));
    });
  });
}); 