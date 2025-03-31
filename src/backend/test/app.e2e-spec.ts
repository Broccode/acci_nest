import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module'; // Adjust path as needed

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close(); // Ensure the application instance is closed after tests
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