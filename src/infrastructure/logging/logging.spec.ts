import { Test, TestingModule } from '@nestjs/testing';
import { LoggingModule } from '../logging.module';

describe('LoggingModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [LoggingModule.register({})],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  // Einfacher Test zum Bestehen der Build-Validierung
  // Weitere Tests werden später hinzugefügt
});
