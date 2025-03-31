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
      .expect('Hello from ACCI Nest Backend!');
  });

  // Test for Task 4: Basic Health Check Endpoint
  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200) // Expect HttpStatus.OK
      .expect({ status: 'ok' }); // Expect the defined response body
  });
}); 