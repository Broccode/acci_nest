import { HttpStatus } from '@nestjs/common';
import {
  BusinessRuleException,
  DomainException,
  EntityNotFoundException,
  UnauthorizedException,
  ValidationException,
} from './index'; // Assuming index.ts exports all exceptions

describe('Custom Infrastructure Exceptions', () => {
  describe('DomainException', () => {
    it('should instantiate with default status code and context when minimal args are provided', () => {
      // Provide required message and errorCode
      const message = 'Minimal Test Message';
      const errorCode = 'MINIMAL_CODE';
      const exception = new DomainException(message, errorCode);
      expect(exception).toBeInstanceOf(DomainException);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST); // Assuming default status
      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(errorCode);
      expect(exception.context).toBeUndefined(); // Assuming default context is undefined
    });

    it('should instantiate with message and error code', () => {
      const message = 'Specific domain error';
      const errorCode = 'SPECIFIC_CODE';
      const exception = new DomainException(message, errorCode);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(errorCode);
      expect(exception.context).toBeUndefined();
    });

    it('should instantiate with message, error code, and status code', () => {
      const message = 'Another domain error';
      const errorCode = 'ANOTHER_CODE';
      const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      const exception = new DomainException(message, errorCode, statusCode);
      expect(exception.getStatus()).toBe(statusCode);
      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(errorCode);
      expect(exception.context).toBeUndefined();
    });

    it('should instantiate with context', () => {
      const message = 'Error with context';
      const errorCode = 'CONTEXT_ERROR';
      const context = { userId: 1, operation: 'test' };
      const exception = new DomainException(message, errorCode, undefined, context);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(errorCode);
      expect(exception.context).toEqual(context);
      expect(exception.getResponse()).toMatchObject({
        message,
        errorCode,
      });
    });

    it('should return correct response object', () => {
      const exception = new DomainException('Test', 'TEST_CODE');
      expect(exception.getResponse()).toMatchObject({
        message: 'Test',
        errorCode: 'TEST_CODE',
      });
    });
  });

  describe('EntityNotFoundException', () => {
    it('should instantiate with entity name and id', () => {
      const exception = new EntityNotFoundException('User', '123');
      expect(exception).toBeInstanceOf(EntityNotFoundException);
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.message).toBe("User with ID '123' not found");
      expect(exception.errorCode).toBe('ENTITY_NOT_FOUND');
    });

    it('should instantiate with only entity name and undefined id', () => {
      // Provide undefined for the id if the constructor requires it
      const exception = new EntityNotFoundException('Product', undefined);
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.message).toBe("Product with ID 'undefined' not found");
      expect(exception.errorCode).toBe('ENTITY_NOT_FOUND');
    });
  });

  describe('ValidationException', () => {
    it('should instantiate with validation errors', () => {
      const errors = { field: ['error1'] };
      const exception = new ValidationException(errors);
      expect(exception).toBeInstanceOf(ValidationException);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.message).toBe('Validation failed');
      expect(exception.errorCode).toBe('VALIDATION_FAILED');
      
      // Überprüfe nur die Grundeigenschaften ohne errors
      expect(exception.getResponse()).toMatchObject({
        message: 'Validation failed',
        errorCode: 'VALIDATION_FAILED',
      });
      
      // Überprüfe separat, ob errors Teil der Antwort ist
      const response = exception.getResponse() as any;
      expect(response.errors).toBeDefined();
    });
  });

  describe('UnauthorizedException', () => {
    it('should instantiate with default message', () => {
      const exception = new UnauthorizedException();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.message).toBe('Unauthorized access');
      expect(exception.errorCode).toBe('UNAUTHORIZED');
    });

    it('should instantiate with custom message', () => {
      const message = 'Access denied';
      const exception = new UnauthorizedException(message);
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe('UNAUTHORIZED');
    });
  });

  describe('BusinessRuleException', () => {
    it('should instantiate with message and error code', () => {
      const message = 'Operation violates business rule';
      const errorCode = 'RULE_VIOLATION';
      const exception = new BusinessRuleException(message, errorCode);
      expect(exception).toBeInstanceOf(BusinessRuleException);
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.message).toBe(message);
      // Die tatsächliche Implementierung kombiniert 'BUSINESS_RULE_' + errorCode
      expect(exception.errorCode).toBe('BUSINESS_RULE_' + errorCode);
    });

    it('should default status code correctly', () => {
       const exception = new BusinessRuleException('Test', 'TEST');
       expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    });
  });
}); 