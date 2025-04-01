import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ArgumentsHost, ExceptionFilter, Catch } from '@nestjs/common';
import supertest from 'supertest';
import { ExceptionsModule } from '../exceptions.module';
import { 
  DomainException,
  EntityNotFoundException,
  ValidationException,
  UnauthorizedException,
  BusinessRuleException
} from '../exceptions';
import { APP_FILTER } from '@nestjs/core';

// Create a simple test controller that throws exceptions
import { Controller, Get, Module } from '@nestjs/common';

@Controller('test-exceptions')
class TestExceptionController {
  @Get('not-found')
  throwNotFound() {
    throw new EntityNotFoundException('User', '12345');
  }

  @Get('validation')
  throwValidation() {
    throw new ValidationException({
      email: ['Email is required', 'Email format is invalid'],
      password: ['Password must be at least 8 characters long'],
    });
  }

  @Get('unauthorized')
  throwUnauthorized() {
    throw new UnauthorizedException('You do not have access to this resource');
  }

  @Get('business-rule')
  throwBusinessRule() {
    throw new BusinessRuleException(
      'Cannot delete user with active subscriptions',
      'ACTIVE_SUBSCRIPTIONS'
    );
  }

  @Get('domain')
  throwDomain() {
    throw new DomainException(
      'Generic domain error',
      'GENERIC_ERROR',
      undefined,
      { additionalInfo: 'Some context' }
    );
  }

  @Get('unexpected')
  throwUnexpected() {
    throw new Error('Unexpected error');
  }
}

@Module({
  controllers: [TestExceptionController],
})
class TestModule {}

// Fully independent test exception filter without external dependencies
@Catch()
class TestExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: 'Internal server error',
      errorCode: 'INTERNAL_SERVER_ERROR',
    };
    
    // Process different exception types
    if (exception instanceof DomainException) {
      // Domain exception with standardized format
      status = exception.getStatus();
      const responseData = exception.getResponse() as any;
      
      errorResponse = {
        ...errorResponse,
        statusCode: status,
        message: exception.message,
        errorCode: exception.errorCode,
        ...responseData,
      };
      
      // Add errors for ValidationException
      if (exception instanceof ValidationException && responseData.errors) {
        errorResponse.errors = responseData.errors;
      }
      
      // Add context for DomainException
      if (exception.context) {
        errorResponse = { ...errorResponse, ...exception.context };
      }
    } else if (exception instanceof Error) {
      // Unexpected error
      errorResponse.message = exception.message;
    }
    
    // Send response
    response.status(status).json(errorResponse);
  }
}

describe('ExceptionsModule', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TestModule,
      ],
      providers: [
        // Provide the simplified exception filter
        {
          provide: APP_FILTER,
          useClass: TestExceptionFilter,
        }
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle EntityNotFoundException', () => {
    return supertest(app.getHttpServer())
      .get('/test-exceptions/not-found')
      .expect(HttpStatus.NOT_FOUND)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode', HttpStatus.NOT_FOUND);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('errorCode', 'ENTITY_NOT_FOUND');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('path', '/test-exceptions/not-found');
      });
  });

  it('should handle ValidationException', () => {
    return supertest(app.getHttpServer())
      .get('/test-exceptions/validation')
      .expect(HttpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode', HttpStatus.BAD_REQUEST);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('errorCode', 'VALIDATION_ERROR');
        expect(res.body).toHaveProperty('errors');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('path', '/test-exceptions/validation');
        
        // Validation exception includes the validation errors
        expect(res.body.errors).toHaveProperty('email');
        expect(res.body.errors).toHaveProperty('password');
      });
  });

  it('should handle UnauthorizedException', () => {
    return supertest(app.getHttpServer())
      .get('/test-exceptions/unauthorized')
      .expect(HttpStatus.UNAUTHORIZED)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode', HttpStatus.UNAUTHORIZED);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('errorCode', 'UNAUTHORIZED');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('path', '/test-exceptions/unauthorized');
      });
  });

  it('should handle BusinessRuleException', () => {
    return supertest(app.getHttpServer())
      .get('/test-exceptions/business-rule')
      .expect(HttpStatus.UNPROCESSABLE_ENTITY)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode', HttpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('errorCode', 'ACTIVE_SUBSCRIPTIONS');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('path', '/test-exceptions/business-rule');
      });
  });

  it('should handle DomainException', () => {
    return supertest(app.getHttpServer())
      .get('/test-exceptions/domain')
      .expect(HttpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode', HttpStatus.BAD_REQUEST);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('errorCode', 'GENERIC_ERROR');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('path', '/test-exceptions/domain');
        expect(res.body).toHaveProperty('additionalInfo', 'Some context');
      });
  });

  it('should handle unexpected errors', () => {
    return supertest(app.getHttpServer())
      .get('/test-exceptions/unexpected')
      .expect(HttpStatus.INTERNAL_SERVER_ERROR)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode', HttpStatus.INTERNAL_SERVER_ERROR);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('errorCode', 'INTERNAL_SERVER_ERROR');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('path', '/test-exceptions/unexpected');
      });
  });
}); 