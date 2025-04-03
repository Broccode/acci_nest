import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create NestJS application
  const app = await NestFactory.create(AppModule, {
    // Disable NestJS logger since we'll use Pino
    logger: false,
  });

  // Create a standard logger for bootstrap messages
  const logger = new Logger('Bootstrap');

  // Get server port from environment or use default
  const port = process.env.PORT || 3000;

  // Start the application
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
}

// Start the application
bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
