import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get() // Basic route for testing
  getHello(): string {
    return this.appService.getHello();
  }

  // Task 4: Basic Health Check Endpoint
  @Get('health')
  @HttpCode(HttpStatus.OK)
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
} 