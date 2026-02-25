import { Test, TestingModule } from '@nestjs/testing';
import { IntercomController } from '@/intercom/intercom.controller';

describe('IntercomController', () => {
  let controller: IntercomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntercomController],
    }).compile();

    controller = module.get<IntercomController>(IntercomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
