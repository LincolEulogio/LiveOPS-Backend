import { Test, TestingModule } from '@nestjs/testing';
import { VmixController } from '@/vmix/vmix.controller';

describe('VmixController', () => {
  let controller: VmixController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VmixController],
    }).compile();

    controller = module.get<VmixController>(VmixController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
