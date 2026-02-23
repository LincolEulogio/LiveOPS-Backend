import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RehearsalService {
    private readonly logger = new Logger(RehearsalService.name);

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
    ) { }

    @Interval(5000)
    async generateMockData() {
        const activeRehearsals = await this.prisma.production.findMany({
            where: {
                isRehearsal: true,
                deletedAt: null,
            },
            select: { id: true },
        });

        for (const prod of activeRehearsals) {
            this.generateMockTelemetry(prod.id);
            this.generateMockSocial(prod.id);
        }
    }

    private generateMockTelemetry(productionId: string) {
        const payload = {
            productionId,
            engineType: 'REHEARSAL',
            cpuUsage: 10 + Math.random() * 5,
            fps: 59 + Math.random() * 2,
            bitrate: 4500 + Math.random() * 1000,
            skippedFrames: 0,
            totalFrames: 1000,
            memoryUsage: 450 + Math.random() * 50,
            isStreaming: true,
            isRecording: false,
            timestamp: new Date().toISOString(),
        };

        this.eventEmitter.emit('production.health.stats', payload);
    }

    private generateMockSocial(productionId: string) {
        if (Math.random() > 0.7) { // Only 30% chance every 5s to get a comment
            const users = ['AlexLive', 'StreamFan_99', 'TechPro', 'LiveMaster', 'CommunityManager'];
            const comments = [
                '¡Increíble la calidad del stream!',
                '¿Cómo haces ese efecto de transición?',
                'Saludos desde España 🇪🇸',
                '¿Qué cámara estás usando?',
                '¡Sigue así, muy buen contenido!',
                'Hola a todos en el chat',
            ];

            const payload = {
                productionId,
                platform: 'REHEARSAL',
                user: users[Math.floor(Math.random() * users.length)],
                message: comments[Math.floor(Math.random() * comments.length)],
                timestamp: new Date().toISOString(),
            };

            this.eventEmitter.emit('social.comment.received', payload);
        }
    }
}
