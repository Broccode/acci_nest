import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Exception for entity not found scenarios
 * Used when a requested entity cannot be found in the database
 */
export class EntityNotFoundException extends DomainException {
  /**
   * Create a new entity not found exception
   * @param entityName - Name of the entity that was not found
   * @param id - ID that was searched for
   * @param context - Additional context information
   */
  constructor(entityName: string, id: string | number, context?: Record<string, any>) {
    super(
      `${entityName} with ID '${id}' not found`,
      'ENTITY_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      context
    );
  }
} 