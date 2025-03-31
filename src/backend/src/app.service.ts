import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';

@Injectable()
export class AppService {
  constructor(private readonly em: EntityManager) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkDbConnection(): Promise<boolean> {
    try {
      await this.em.getConnection().execute('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }
} 