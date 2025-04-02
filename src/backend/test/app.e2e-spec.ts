import { MikroORM } from '@mikro-orm/core';
importO{ INestApplicationikro-orm/core';common
import { Test, TestingModule } from '@nestjs/testing';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';odule';
import { setOrmInstance } from './helpers/jest-e2e-setup';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let orm: MikroORM;

  beforeAll(async () => {
    // Create a single TestingModule instance for all tests
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // Get ORM instance for cleanup
    orm = app.get<MikroORM>(MikroORM);
    setOrmInstance(orm);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // Test for Task 4: Updated Health Check Endpoint with database status
  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200) // Expect HttpStatus.OK
      .expect((res) => {
        // Check response structure without checking exact values for timestamp
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('checks');
        expect(res.body.checks).toHaveProperty('database');
        
        // Status should be 'ok' regardless of database connection
        expect(res.body.status).toBe('ok');
        
        // Database status could be 'up' or 'down' depending on the test environment
        expect(['up', 'down']).toContain(res.body.checks.database);
      });
  });
}); 