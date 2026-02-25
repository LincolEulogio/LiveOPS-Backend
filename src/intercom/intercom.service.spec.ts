import { Test, TestingModule } from '@nestjs/testing';
import { IntercomService } from '@/intercom/intercom.service';

describe('IntercomService', () => {
  let service: IntercomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntercomService],
    }).compile();

    service = module.get<IntercomService>(IntercomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
