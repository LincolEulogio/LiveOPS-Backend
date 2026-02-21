import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTimelineBlockDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    durationMs?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    order?: number;

    @IsString()
    @IsOptional()
    linkedScene?: string;

    @IsUUID()
    @IsOptional()
    intercomTemplateId?: string;
}

export class UpdateTimelineBlockDto extends CreateTimelineBlockDto { }

export class ReorderBlocksDto {
    @IsUUID(4, { each: true })
    blockIds: string[];
}
