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
export declare class CreateProductionDto {
    name: string;
    description?: string;
    engineType?: EngineType;
    status?: ProductionStatus;
}
export declare class UpdateProductionDto {
    name?: string;
    description?: string;
    engineType?: EngineType;
    status?: ProductionStatus;
}
export declare class UpdateProductionStateDto {
    status: ProductionStatus;
}
export declare class AssignUserDto {
    email: string;
    roleName: string;
}
