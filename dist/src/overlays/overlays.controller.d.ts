import { OverlaysService } from './overlays.service';
import { CreateOverlayDto, UpdateOverlayDto } from './dto/overlay.dto';
export declare class OverlaysController {
    private readonly overlaysService;
    constructor(overlaysService: OverlaysService);
    create(productionId: string, dto: CreateOverlayDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        productionId: string;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: import("@prisma/client/runtime/client").JsonValue;
    }>;
    findAll(productionId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        productionId: string;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: import("@prisma/client/runtime/client").JsonValue;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        productionId: string;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: import("@prisma/client/runtime/client").JsonValue;
    }>;
    update(id: string, dto: UpdateOverlayDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        productionId: string;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: import("@prisma/client/runtime/client").JsonValue;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        productionId: string;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: import("@prisma/client/runtime/client").JsonValue;
    }>;
    toggleActive(id: string, productionId: string, isActive: boolean): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        productionId: string;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: import("@prisma/client/runtime/client").JsonValue;
    }>;
}
