import { Test, TestingModule } from '@nestjs/testing';
import { VmixService } from './vmix.service';

describe('VmixService', () => {
  let service: VmixService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VmixService],
    }).compile();

    service = module.get<VmixService>(VmixService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
