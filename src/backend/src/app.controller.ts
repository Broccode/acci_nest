import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get() // Basic route for testing
  getHello(): string {
    return this.appService.getHello();
  }

  // Task 4: Basic Health Check Endpoint - updated with database status
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<{ status: string, timestamp: string, checks: { database: string } }> {
    const dbStatus = await this.appService.checkDbConnection();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus ? 'up' : 'down',
      }
    };
  }
} 