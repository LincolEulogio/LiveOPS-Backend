import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class CreateOverlayDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsObject()
    config: any;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateOverlayDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsObject()
    @IsOptional()
    config?: any;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
