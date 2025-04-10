import { EntityManager } from '@mikro-orm/core';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { REDIS_CLIENT } from '../src/common/constants';
import { registerRedisClient, setOrmInstance } from './helpers/jest-e2e-setup';
import { MultiTenantTestEnvironment } from './utils/containers/multi-tenant-test-environment';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let environment: MultiTenantTestEnvironment;

  beforeAll(async () => {
    // Create MultiTenantTestEnvironment for E2E tests
    environment = new MultiTenantTestEnvironment({
      postgres: {
        entities: [], // Add required entities here (e.g., User, Role, etc.)
        generateSchema: true,
      },
      redis: {}, // Enable Redis integration
      defaultTenantId: uuidv4(),
      providers: [AppService],
    });

    // Start test environment
    moduleFixture = await environment.start();

    // Register Redis client for proper cleanup
    const redisClient = environment.getRedisClient();
    if (redisClient) {
      registerRedisClient(redisClient);
    }

    // Register ORM instance for cleanup
    const mikroOrm = environment.getMikroOrmInstance();
    if (mikroOrm) {
      setOrmInstance(mikroOrm);
    }

    // Manually register AppController
    moduleFixture = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useFactory: () => moduleFixture.get(AppService),
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // If Redis client is available from NestJS module, register it too
    try {
      const redisClient = app.get<Redis>(REDIS_CLIENT);
      if (redisClient) {
        registerRedisClient(redisClient);
      }
    } catch (e) {
      // Ignore errors if no Redis client is available
    }
  }, 30000); // Increase timeout for container startup

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (environment) {
      await environment.stop();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  // Test for Health Check Endpoint
  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });
});
