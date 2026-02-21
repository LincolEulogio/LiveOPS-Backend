import { IsNotEmpty, IsOptional, IsString, IsEnum, ValidateNested, IsBoolean, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

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

export class ObsConfigDto {
    @IsString()
    @IsOptional()
    host?: string;

    @IsString()
    @IsOptional()
    port?: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean;
}

export class VmixConfigDto {
    @IsString()
    @IsOptional()
    host?: string;

    @IsString()
    @IsOptional()
    port?: string;

    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean;
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
    @ValidateNested()
    @Type(() => ObsConfigDto)
    obsConfig?: ObsConfigDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => VmixConfigDto)
    vmixConfig?: VmixConfigDto;
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
