import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { LiveKitService } from '@/streaming/livekit.service';
import { PrismaService } from '@/prisma/prisma.service';

import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export type RoomType = 'general' | 'direction' | 'production' | 'technical';
export type ParticipantRole = 'host' | 'panelist' | 'viewer' | 'green-room';

export class CreateVideoCallDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(['general', 'direction', 'production', 'technical'])
  roomType?: RoomType;
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

  @IsOptional()
  @IsString()
  egressId?: string | null;
}

/** Permissions matrix per participant role */
function permissionsForRole(role: ParticipantRole): {
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  roomAdmin: boolean;
} {
  switch (role) {
    case 'host':
      return { canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: true };
    case 'panelist':
      return { canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: false };
    case 'viewer':
      return { canPublish: false, canSubscribe: true, canPublishData: false, roomAdmin: false };
    case 'green-room':
      // Can see/hear themselves but cannot publish to the main room
      return { canPublish: false, canSubscribe: false, canPublishData: true, roomAdmin: false };
  }
}

@Injectable()
export class VideoCallService {
  constructor(
    private readonly liveKitService: LiveKitService,
    private readonly prisma: PrismaService,
  ) {}

  async create(hostId: string, dto: CreateVideoCallDto) {
    const roomId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      return await this.prisma.videoCall.create({
        data: {
          roomId,
          title: dto.title,
          description: dto.description ?? null,
          hostId,
          roomType: dto.roomType ?? 'general',
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        },
        include: { host: { select: { id: true, name: true, email: true } } },
      });
    } catch (error: unknown) {
      console.error('Error creating video call:', error);
      throw error;
    }
  }

  async findByRoomId(roomId: string) {
    return this.prisma.videoCall.findUnique({
      where: { roomId },
      include: { host: { select: { id: true, name: true, email: true } } },
    });
  }

  async findAll() {
    return this.prisma.videoCall.findMany({
      where: { status: { not: 'ended' } },
      orderBy: [
        { status: 'asc' },
        { scheduledAt: 'asc' },
        { createdAt: 'desc' },
      ],
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
        ...(dto.egressId !== undefined && { egressId: dto.egressId }),
      },
      include: { host: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.videoCall.delete({ where: { id } });
  }

  async generateJoinToken(
    roomId: string,
    identity: string,
    name: string,
    role: ParticipantRole,
  ) {
    const permissions = permissionsForRole(role);
    const lkRoomId = role === 'green-room' ? `greenroom_${roomId}` : `vcall_${roomId}`;
    return this.liveKitService.generateToken(lkRoomId, identity, name, {
      roomAdmin: permissions.roomAdmin,
      canPublish: permissions.canPublish,
      canSubscribe: permissions.canSubscribe,
      canPublishData: permissions.canPublishData,
    });
  }

  async startRecording(id: string, requesterId: string): Promise<{ egressId: string }> {
    const call = await this.findOne(id);
    if (call.hostId !== requesterId) throw new ForbiddenException('Solo el host puede iniciar la grabación');
    if (call.egressId) throw new ForbiddenException('Ya hay una grabación activa');

    const egress = await this.liveKitService.startRoomCompositeRecording(`vcall_${call.roomId}`);
    await this.update(id, { egressId: egress.egressId });
    return { egressId: egress.egressId };
  }

  async stopRecording(id: string, requesterId: string): Promise<{ stopped: boolean }> {
    const call = await this.findOne(id);
    if (call.hostId !== requesterId) throw new ForbiddenException('Solo el host puede detener la grabación');
    if (!call.egressId) throw new NotFoundException('No hay grabación activa');

    await this.liveKitService.stopEgress(call.egressId);
    await this.update(id, { egressId: null });
    return { stopped: true };
  }

  getLiveKitUrl() {
    return this.liveKitService.getLiveKitUrl();
  }
}
