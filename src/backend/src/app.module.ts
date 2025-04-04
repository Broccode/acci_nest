import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './common/cache/cache.module';
import {
  CompressionMiddleware,
  ConditionalRequestMiddleware,
  HttpCacheMiddleware,
} from './common/compression';
import { PerformanceModule } from './common/performance';
import { PerformanceInterceptor } from './common/performance';
import { RateLimitModule } from './common/rate-limiting';
import { RedisModule } from './common/redis/redis.module';
import configuration from './config/configuration';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Database - MikroORM
    MikroOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        driver: PostgreSqlDriver,
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        user: configService.get('database.username'),
        password: configService.get('database.password'),
        dbName: configService.get('database.name'),
        entities: ['dist/**/*.entity.js'],
        entitiesTs: ['src/**/*.entity.ts'],
        debug: configService.get('environment') === 'development',
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),

    // Cache module
    CacheModule.register({
      isGlobal: true, // Make cache services available globally
    }),

    // Rate limiting module
    RateLimitModule,

    // Performance monitoring module
    PerformanceModule,

    // Authentication module
    AuthModule,

    // Application modules
    TenantsModule,
    UsersModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global performance interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply compression for all routes
    consumer.apply(CompressionMiddleware).forRoutes('*');

    // Apply HTTP caching and conditional requests for specific routes
    consumer
      .apply(HttpCacheMiddleware, ConditionalRequestMiddleware)
      .forRoutes('api/public', 'api/assets');
  }
}
