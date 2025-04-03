import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CompressionMiddleware, HttpCacheMiddleware } from './common/compression';
// import { ValidationPipe } from '@nestjs/common'; // Temporarily commented out
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // Temporarily commented out
// import * as helmet from 'helmet'; // Temporarily commented out

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.BACKEND_PORT || 3000;

  // Apply compression middleware
  const compressionMiddleware = new CompressionMiddleware();
  app.use(compressionMiddleware.use.bind(compressionMiddleware));

  // Apply HTTP cache middleware with minimal configuration
  const httpCacheMiddleware = new HttpCacheMiddleware();
  app.use(httpCacheMiddleware.use.bind(httpCacheMiddleware));

  // app.setGlobalPrefix('api'); // Temporarily commented out

  // app.enableCors(); // Temporarily commented out

  // app.use(helmet()); // Temporarily commented out - Caused Linter Error

  // app.useGlobalPipes( // Temporarily commented out
  //   new ValidationPipe({
  //     whitelist: true,
  //     transform: true,
  //     forbidNonWhitelisted: true,
  //     transformOptions: {
  //       enableImplicitConversion: true,
  //     },
  //   }),
  // );

  // const config = new DocumentBuilder() // Temporarily commented out
  //   .setTitle('ACCI Nest API')
  //   .setDescription('The ACCI Nest API documentation')
  //   .setVersion('1.0')
  //   .addBearerAuth()
  //   .build();
  // const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
