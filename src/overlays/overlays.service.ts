import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOverlayDto, UpdateOverlayDto } from './dto/overlay.dto';

@Injectable()
export class OverlaysService {
    constructor(private prisma: PrismaService) { }

    async create(productionId: string, dto: CreateOverlayDto) {
        return this.prisma.overlayTemplate.create({
            data: {
                ...dto,
                productionId,
            },
        });
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
        return this.prisma.overlayTemplate.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        return this.prisma.overlayTemplate.delete({
            where: { id },
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

        return this.prisma.overlayTemplate.update({
            where: { id },
            data: { isActive },
        });
    }
}
