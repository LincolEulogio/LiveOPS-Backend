export declare class CreateProductionDto {
    name: string;
    description?: string;
}
export declare enum ProductionStatus {
    DRAFT = "DRAFT",
    LIVE = "LIVE",
    FINISHED = "FINISHED"
}
export declare class UpdateProductionStateDto {
    status: ProductionStatus;
}
export declare class AssignUserDto {
    email: string;
    roleName: string;
}
