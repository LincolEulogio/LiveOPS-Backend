import { Test, TestingModule } from '@nestjs/testing';
import { ObsController } from '@/obs/obs.controller';

describe('ObsController', () => {
  let controller: ObsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObsController],
    }).compile();

    controller = module.get<ObsController>(ObsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
