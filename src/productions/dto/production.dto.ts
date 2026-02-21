import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

export enum EngineType {
    OBS = 'OBS',
    VMIX = 'VMIX',
}

export enum ProductionStatus {
    SETUP = 'SETUP',
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
    DRAFT = 'DRAFT',
}

export class CreateProductionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(EngineType)
    @IsOptional()
    engineType?: EngineType;

    @IsEnum(ProductionStatus)
    @IsOptional()
    status?: ProductionStatus;
}

export class UpdateProductionDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(EngineType)
    @IsOptional()
    engineType?: EngineType;

    @IsEnum(ProductionStatus)
    @IsOptional()
    status?: ProductionStatus;

    @IsOptional()
    obsConfig?: {
        url: string;
        password?: string;
        isEnabled?: boolean;
    };

    @IsOptional()
    vmixConfig?: {
        url: string;
        isEnabled?: boolean;
    };
}

export class UpdateProductionStateDto {
    @IsEnum(ProductionStatus)
    status: ProductionStatus;
}

export class AssignUserDto {
    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    roleName: string;
}
