import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateOverlayDto, UpdateOverlayDto } from '@/overlays/dto/overlay.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OverlaysService {
    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2
    ) { }

    async create(productionId: string, dto: CreateOverlayDto) {
        const overlay = await this.prisma.overlayTemplate.create({
            data: {
                ...dto,
                productionId,
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
        const overlay = await this.prisma.overlayTemplate.update({
            where: { id },
            data: dto,
        });
        this.eventEmitter.emit('overlay.template_updated', { productionId: overlay.productionId, template: overlay });
        return overlay;
    }

    async remove(id: string) {
        const overlay = await this.findOne(id);
        await this.prisma.overlayTemplate.delete({
            where: { id },
        });
        this.eventEmitter.emit('overlay.list_updated', { productionId: overlay.productionId });
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

        this.eventEmitter.emit('overlay.list_updated', { productionId });
        return overlay;
    }
}
