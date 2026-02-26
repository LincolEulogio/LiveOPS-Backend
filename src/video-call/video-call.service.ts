import { Injectable, NotFoundException } from '@nestjs/common';
import { LiveKitService } from '@/streaming/livekit.service';
import { AccessToken } from 'livekit-server-sdk';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateVideoCallDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsDateString()
    scheduledAt?: string;
}

export class UpdateVideoCallDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsDateString()
    scheduledAt?: string;

    @IsOptional()
    @IsEnum(['scheduled', 'active', 'ended'])
    status?: 'scheduled' | 'active' | 'ended';
}

@Injectable()
export class VideoCallService {
    constructor(
        private readonly liveKitService: LiveKitService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) { }

    async create(hostId: string, dto: CreateVideoCallDto) {
        const roomId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        try {
            return await this.prisma.videoCall.create({
                data: {
                    roomId,
                    title: dto.title,
                    description: dto.description || null,
                    hostId,
                    scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
                },
                include: { host: { select: { id: true, name: true, email: true } } },
            });
        } catch (error) {
            console.error('Error creating video call:', error);
            throw error;
        }
    }

    async findAll() {
        return this.prisma.videoCall.findMany({
            where: { status: { not: 'ended' } },
            orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }, { createdAt: 'desc' }],
            include: { host: { select: { id: true, name: true, email: true } } },
        });
    }

    async findOne(id: string) {
        const call = await this.prisma.videoCall.findUnique({
            where: { id },
            include: { host: { select: { id: true, name: true, email: true } } },
        });
        if (!call) throw new NotFoundException(`VideoCall ${id} not found`);
        return call;
    }

    async update(id: string, dto: UpdateVideoCallDto) {
        await this.findOne(id);
        return this.prisma.videoCall.update({
            where: { id },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
                ...(dto.status && { status: dto.status }),
                ...(dto.status === 'ended' && { endedAt: new Date() }),
            },
            include: { host: { select: { id: true, name: true, email: true } } },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.videoCall.delete({ where: { id } });
    }

    async generateJoinToken(roomId: string, identity: string, name: string, isHost = false) {
        const apiKey = this.configService.get<string>('LIVEKIT_API_KEY') || 'devkey';
        const apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET') || 'secret';
        const at = new AccessToken(apiKey, apiSecret, { identity, name });
        at.addGrant({ roomJoin: true, room: `vcall_${roomId}`, canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: isHost });
        return at.toJwt();
    }

    getLiveKitUrl() { return this.liveKitService.getLiveKitUrl(); }
}
