import { PrismaService } from '@/prisma/prisma.service';
import { CreateStreamingDestinationDto, UpdateStreamingDestinationDto } from '@/streaming/dto/streaming-destination.dto';
export declare class StreamingDestinationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(productionId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        isEnabled: boolean;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        isEnabled: boolean;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
    create(productionId: string, dto: CreateStreamingDestinationDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        isEnabled: boolean;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
    update(id: string, dto: UpdateStreamingDestinationDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        isEnabled: boolean;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        isEnabled: boolean;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
    toggleActive(id: string, isActive: boolean): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        isEnabled: boolean;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
}
