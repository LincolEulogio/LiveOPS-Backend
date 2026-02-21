import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateProductionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export enum ProductionStatus {
    DRAFT = 'DRAFT',
    LIVE = 'LIVE',
    FINISHED = 'FINISHED',
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
