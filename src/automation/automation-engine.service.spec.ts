import { Test, TestingModule } from '@nestjs/testing';
import { AutomationEngineService } from './automation-engine.service';

describe('AutomationEngineService', () => {
  let service: AutomationEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutomationEngineService],
    }).compile();

    service = module.get<AutomationEngineService>(AutomationEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
