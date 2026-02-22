export declare enum EngineType {
    OBS = "OBS",
    VMIX = "VMIX"
}
export declare enum ProductionStatus {
    SETUP = "SETUP",
    ACTIVE = "ACTIVE",
    ARCHIVED = "ARCHIVED",
    DRAFT = "DRAFT"
}
export declare class ObsConfigDto {
    host?: string;
    port?: string;
    password?: string;
    isEnabled?: boolean;
    pollingInterval?: number;
}
export declare class VmixConfigDto {
    host?: string;
    port?: string;
    isEnabled?: boolean;
    pollingInterval?: number;
}
export declare class CreateProductionDto {
    name: string;
    description?: string;
    engineType?: EngineType;
    status?: ProductionStatus;
    initialMembers?: AssignUserDto[];
}
export declare class UpdateProductionDto {
    name?: string;
    description?: string;
    engineType?: EngineType;
    status?: ProductionStatus;
    obsConfig?: ObsConfigDto;
    vmixConfig?: VmixConfigDto;
}
export declare class UpdateProductionStateDto {
    status: ProductionStatus;
}
export declare class AssignUserDto {
    email: string;
    roleName: string;
}
export declare class GetProductionsQueryDto {
    page?: string;
    limit?: string;
    status?: string;
    search?: string;
}
