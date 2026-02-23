import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStreamingDestinationDto, UpdateStreamingDestinationDto } from './dto/streaming-destination.dto';

@Injectable()
export class StreamingDestinationsService {
    constructor(private prisma: PrismaService) { }

    async findAll(productionId: string) {
        return this.prisma.streamingDestination.findMany({
            where: { productionId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async findOne(id: string) {
        const destination = await this.prisma.streamingDestination.findUnique({
            where: { id },
        });
        if (!destination) throw new NotFoundException('Streaming destination not found');
        return destination;
    }

    async create(productionId: string, dto: CreateStreamingDestinationDto) {
        return this.prisma.streamingDestination.create({
            data: {
                ...dto,
                productionId,
            },
        });
    }

    async update(id: string, dto: UpdateStreamingDestinationDto) {
        await this.findOne(id);
        return this.prisma.streamingDestination.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.streamingDestination.delete({
            where: { id },
        });
    }

    async toggleActive(id: string, isActive: boolean) {
        await this.findOne(id);
        return this.prisma.streamingDestination.update({
            where: { id },
            data: { isActive },
        });
    }
}
