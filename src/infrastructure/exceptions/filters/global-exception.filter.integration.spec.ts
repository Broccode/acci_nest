import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, HttpException, HttpStatus, INestApplication, Inject, Post } from '@nestjs/common';
import * as request from 'supertest';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './global-exception.filter';
import { LOGGING_SERVICE } from '../../logging/logging.module';
import { LoggingService } from '../../logging/interfaces';
import {
  BusinessRuleException,
  DomainException,
  EntityNotFoundException,
  UnauthorizedException,
  ValidationException,
} from '../exceptions';

// Mock Logging Service
const mockLoggingService: Partial<LoggingService> = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  createChildLogger: jest.fn().mockReturnThis(), // Ensure chainability if needed
};

// Test Controller to trigger exceptions
@Controller()
class TestController {
  @Get('/http')
  throwHttpException() {
    throw new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
  }

  @Get('/entity-not-found')
  throwEntityNotFound() {
    throw new EntityNotFoundException('Item', 'abc');
  }

  @Post('/validation')
  throwValidation() {
    throw new ValidationException({ email: ['invalid format'] });
  }

  @Get('/unauthorized')
  throwUnauthorized() {
    throw new UnauthorizedException('Token expired');
  }

  @Post('/business-rule')
  throwBusinessRule() {
    // Pass status code as the third argument directly
    // @ts-ignore - BusinessRuleException expects status as 3rd arg, not in context
    throw new BusinessRuleException('Insufficient funds', 'INSUFFICIENT_FUNDS', HttpStatus.UNPROCESSABLE_ENTITY);
  }
  
  @Get('/domain-context')
  throwDomainWithContext() {
    throw new DomainException('Order processing failed', 'ORDER_FAIL', HttpStatus.BAD_REQUEST, { orderId: 555 });
  }

  @Get('/unexpected-error')
  throwUnexpectedError() {
    throw new Error('Something broke!');
  }

  @Get('/non-error')
  throwNonError() {
    // eslint-disable-next-line no-throw-literal
    throw 'this is just a string';
  }
}

describe('GlobalExceptionFilter (Integration)', () => {
  let app: INestApplication;
  let loggingService: LoggingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: LOGGING_SERVICE, useValue: mockLoggingService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    loggingService = moduleFixture.get<LoggingService>(LOGGING_SERVICE);
    await app.init();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle HttpException', async () => {
    const response = await request(app.getHttpServer())
      .get('/http')
      .expect(HttpStatus.FORBIDDEN);

    expect(response.body).toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
      message: 'Forbidden resource',
      errorCode: 'HTTP_EXCEPTION', // Added errorCode expectation
      path: '/http',
      timestamp: expect.any(String),
    });
    expect(loggingService.warn).toHaveBeenCalledWith(
      'HTTP exception: Forbidden resource',
      expect.objectContaining({ path: '/http' })
    );
  });

  it('should handle EntityNotFoundException', async () => {
    const response = await request(app.getHttpServer())
      .get('/entity-not-found')
      .expect(HttpStatus.NOT_FOUND);

    expect(response.body).toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Item with ID 'abc' not found", // Corrected message
      errorCode: 'ENTITY_NOT_FOUND',
      path: '/entity-not-found',
      timestamp: expect.any(String),
    });
    expect(loggingService.warn).toHaveBeenCalledWith(
      "Domain exception: Item with ID 'abc' not found",
      expect.objectContaining({ path: '/entity-not-found', errorCode: 'ENTITY_NOT_FOUND' })
    );
  });

  it('should handle ValidationException', async () => {
    const response = await request(app.getHttpServer())
      .post('/validation')
      .expect(HttpStatus.BAD_REQUEST);

    expect(response.body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Validation failed',
      errorCode: 'VALIDATION_FAILED', 
      errors: { email: ['invalid format'] },
      path: '/validation',
      timestamp: expect.any(String),
    });
    expect(loggingService.warn).toHaveBeenCalledWith(
      'Domain exception: Validation failed',
      expect.objectContaining({ 
        path: '/validation', 
        errorCode: 'VALIDATION_FAILED',
        context: { validationErrors: { email: ['invalid format'] } }
      })
    );
  });

  it('should handle UnauthorizedException', async () => {
    const response = await request(app.getHttpServer())
      .get('/unauthorized')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(response.body).toMatchObject({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'Token expired',
      errorCode: 'UNAUTHORIZED',
      path: '/unauthorized',
      timestamp: expect.any(String),
    });
    expect(loggingService.warn).toHaveBeenCalledWith(
      'Domain exception: Token expired',
      expect.objectContaining({ path: '/unauthorized', errorCode: 'UNAUTHORIZED' })
    );
  });

  it('should handle BusinessRuleException', async () => {
    const response = await request(app.getHttpServer())
      .post('/business-rule')
      .expect(HttpStatus.UNPROCESSABLE_ENTITY); // Expecting 422 based on exception thrown

    expect(response.body).toMatchObject({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Insufficient funds',
      // Note: The errorCode in the response might still be BUSINESS_RULE_INSUFFICIENT_FUNDS depending on the filter implementation
      errorCode: 'BUSINESS_RULE_INSUFFICIENT_FUNDS', 
      path: '/business-rule',
      timestamp: expect.any(String),
    });
    expect(loggingService.warn).toHaveBeenCalledWith(
      'Domain exception: Insufficient funds',
      expect.objectContaining({ 
        path: '/business-rule', 
        errorCode: 'BUSINESS_RULE_INSUFFICIENT_FUNDS' 
      })
    );
  });
  
  it('should handle generic DomainException with context', async () => {
    const response = await request(app.getHttpServer())
      .get('/domain-context')
      .expect(HttpStatus.BAD_REQUEST);

    expect(response.body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Order processing failed',
      errorCode: 'ORDER_FAIL',
      context: { orderId: 555 }, // Check context is passed through
      path: '/domain-context',
      timestamp: expect.any(String),
    });
    expect(loggingService.warn).toHaveBeenCalledWith(
      'Domain exception: Order processing failed',
      expect.objectContaining({ 
        path: '/domain-context', 
        errorCode: 'ORDER_FAIL', 
        context: { orderId: 555 } 
      })
    );
  });

  it('should handle unexpected Error', async () => {
    const response = await request(app.getHttpServer())
      .get('/unexpected-error')
      .expect(HttpStatus.INTERNAL_SERVER_ERROR);

    expect(response.body).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error', 
      path: '/unexpected-error',
      timestamp: expect.any(String),
    });
    expect(loggingService.error).toHaveBeenCalledWith(
      'Unhandled exception', // Corrected log message
      expect.any(Error),
      expect.objectContaining({ path: '/unexpected-error' })
    );
  });

  it('should handle non-Error exceptions', async () => {
    const response = await request(app.getHttpServer())
      .get('/non-error')
      .expect(HttpStatus.INTERNAL_SERVER_ERROR);

    expect(response.body).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error', 
      path: '/non-error',
      timestamp: expect.any(String),
    });
    expect(loggingService.error).toHaveBeenCalledWith(
      'Unhandled exception', // Corrected log message
      expect.any(Error), // It gets wrapped in an Error object
      expect.objectContaining({ path: '/non-error' })
    );
  });
}); 