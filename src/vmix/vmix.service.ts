import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VmixConnectionManager } from './vmix-connection.manager';
import { SaveVmixConnectionDto, ChangeInputDto } from './dto/vmix.dto';

@Injectable()
export class VmixService {
    private readonly logger = new Logger(VmixService.name);

    constructor(
        private prisma: PrismaService,
        private vmixManager: VmixConnectionManager
    ) { }

    async saveConnection(productionId: string, dto: SaveVmixConnectionDto) {
        const connection = await this.prisma.vmixConnection.upsert({
            where: { productionId },
            update: {
                url: dto.url,
                isEnabled: dto.isEnabled ?? true,
            },
            create: {
                productionId,
                url: dto.url,
                isEnabled: dto.isEnabled ?? true,
            }
        });

        if (connection.isEnabled) {
            this.vmixManager.connectVmix(productionId, connection.url);
        } else {
            this.vmixManager.stopPolling(productionId);
        }

        return connection;
    }

    async getConnection(productionId: string) {
        const conn = await this.prisma.vmixConnection.findUnique({
            where: { productionId }
        });
        if (!conn) throw new NotFoundException('vMix Connection not configured for this production');
        return conn;
    }

    isConnected(productionId: string): boolean {
        return this.vmixManager.isConnected(productionId);
    }

    // --- vMix Commands --- //

    async changeInput(productionId: string, dto: ChangeInputDto) {
        try {
            // The vMix API uses 'Cut' passing an Input number to hard switch
            await this.vmixManager.sendCommand(productionId, 'Cut', { Input: dto.input });
            return { success: true, input: dto.input, action: 'cut' };
        } catch (e: any) {
            this.logger.error(`Failed to change input: ${e.message}`);
            throw new BadRequestException(`vMix Error: ${e.message || 'Unknown'}`);
        }
    }

    async cut(productionId: string) {
        try {
            // Triggers whatever is in Preview to cut to Active
            await this.vmixManager.sendCommand(productionId, 'Cut');
            return { success: true, action: 'cut' };
        } catch (e: any) {
            this.logger.error(`Failed to trigger cut: ${e.message}`);
            throw new BadRequestException(`vMix Error: ${e.message || 'Unknown'}`);
        }
    }

    async fade(productionId: string) {
        try {
            // Triggers a fade transition from Preview to Active
            await this.vmixManager.sendCommand(productionId, 'Fade');
            return { success: true, action: 'fade' };
        } catch (e: any) {
            this.logger.error(`Failed to trigger fade: ${e.message}`);
            throw new BadRequestException(`vMix Error: ${e.message || 'Unknown'}`);
        }
    }
}
