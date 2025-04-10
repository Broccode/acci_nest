import { HttpCacheMiddleware } from './http-cache.middleware';
import { NextFunction, Request, Response } from 'express';
import { Logger } from '@nestjs/common';

describe('HttpCacheMiddleware', () => {
  let middleware: HttpCacheMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Mock Logger
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    
    // Create middleware instance
    middleware = new HttpCacheMiddleware();

    // Setup request and response mocks
    mockResponse = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn() as NextFunction;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('sollte Cache-Control-Header für GET-Anfragen setzen', () => {
      // Arrange
      mockRequest = { method: 'GET' };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
      expect(mockNext).toHaveBeenCalled();
    });

    it('sollte keine Cache-Control-Header für nicht-GET-Anfragen setzen', () => {
      // Arrange
      mockRequest = { method: 'POST' };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Assert
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('sollte keine Cache-Control-Header für PUT-Anfragen setzen', () => {
      // Arrange
      mockRequest = { method: 'PUT' };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Assert
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('sollte keine Cache-Control-Header für DELETE-Anfragen setzen', () => {
      // Arrange
      mockRequest = { method: 'DELETE' };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Assert
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('sollte mit komplexeren GET-Anfragen umgehen können', () => {
      // Arrange
      mockRequest = {
        method: 'GET',
        url: '/api/data?param=value',
        headers: {
          'accept': 'application/json',
        }
      };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
      expect(mockNext).toHaveBeenCalled();
    });

    it('sollte mit HTTP-HEAD-Anfragen umgehen können', () => {
      // Arrange
      mockRequest = { method: 'HEAD' };
      
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Assert
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
}); 