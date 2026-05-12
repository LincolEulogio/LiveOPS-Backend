import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateOverlayDto, UpdateOverlayDto } from '@/overlays/dto/overlay.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

@Injectable()
export class OverlaysService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(productionId: string, dto: CreateOverlayDto) {
    const overlay = await this.prisma.overlayTemplate.create({
      data: {
        ...dto,
        productionId,
        config: dto.config as Prisma.InputJsonValue,
      },
    });
    this.eventEmitter.emit('overlay.list_updated', { productionId });
    return overlay;
  }

  async findAll(productionId: string) {
    return this.prisma.overlayTemplate.findMany({
      where: { productionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const overlay = await this.prisma.overlayTemplate.findUnique({
      where: { id },
    });
    if (!overlay) throw new NotFoundException('Overlay not found');
    return overlay;
  }

  async update(id: string, dto: UpdateOverlayDto) {
    const { config, ...rest } = dto;
    const overlay = await this.prisma.overlayTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...(config !== undefined && {
          config: config as Prisma.InputJsonValue,
        }),
      },
    });
    this.eventEmitter.emit('overlay.template_updated', {
      productionId: overlay.productionId,
      template: overlay,
    });
    return overlay;
  }

  async remove(id: string) {
    const overlay = await this.findOne(id);
    await this.prisma.overlayTemplate.delete({
      where: { id },
    });
    this.eventEmitter.emit('overlay.list_updated', {
      productionId: overlay.productionId,
    });
  }

  async toggleActive(id: string, productionId: string, isActive: boolean) {
    // If setting to active, deactivate all others in the same production
    if (isActive) {
      await this.prisma.overlayTemplate.updateMany({
        where: { productionId },
        data: { isActive: false },
      });
    }

    const overlay = await this.prisma.overlayTemplate.update({
      where: { id },
      data: { isActive },
    });

    if (isActive) {
      this.eventEmitter.emit('overlay.activated', {
        productionId,
        overlayId: id,
      });
    }

    this.eventEmitter.emit('overlay.list_updated', { productionId });
    return overlay;
  }

  async syncLayerContent(
    productionId: string,
    layerBindings: Record<string, string>,
  ) {
    // Find the active overlay for this production
    const activeOverlay = await this.prisma.overlayTemplate.findFirst({
      where: { productionId, isActive: true },
    });

    if (!activeOverlay) return;
    interface OverlayLayer {
      name: string;
      content: string;
      [key: string]: any;
    }

    interface OverlayConfig {
      layers: OverlayLayer[];
      [key: string]: any;
    }

    const config = (activeOverlay.config as unknown as OverlayConfig) || {
      layers: [],
    };
    const layers = config.layers || [];
    let modified = false;

    // Update layers that match the binding keys
    const updatedLayers = layers.map((layer: OverlayLayer) => {
      // Check if layer name or a custom binding field matches
      const bindingKey = layer.name.toLowerCase().replace(/\s+/g, '_');
      if (layerBindings[bindingKey] !== undefined) {
        modified = true;
        return { ...layer, content: String(layerBindings[bindingKey]) };
      }
      return layer;
    });

    if (modified) {
      await this.update(activeOverlay.id, {
        config: { ...config, layers: updatedLayers },
      });
    }
  }

  async findOneActive(productionId: string) {
    return this.prisma.overlayTemplate.findFirst({
      where: { productionId, isActive: true },
    });
  }
}
