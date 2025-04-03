import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get() // Basic route for testing
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async checkHealth() {
    const dbConnected = await this.appService.checkDbConnection();
    return {
      status: dbConnected ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'ok',
        },
        database: {
          status: dbConnected ? 'ok' : 'error',
        },
      },
    };
  }

  @Get('health/details')
  async getDatabaseHealthDetails() {
    const dbHealth = await this.appService.getDatabaseHealth();
    return {
      status: dbHealth.connected ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'ok',
          version: process.env.npm_package_version || '0.1.0',
          environment: process.env.NODE_ENV || 'development',
        },
        database: {
          status: dbHealth.connected ? 'ok' : 'error',
          version: dbHealth.version,
          migrations: dbHealth.migrationStatus,
          pool: dbHealth.connectionPool,
          stats: dbHealth.stats,
        },
      },
    };
  }
}
