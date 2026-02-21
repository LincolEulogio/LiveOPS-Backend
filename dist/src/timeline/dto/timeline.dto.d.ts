export declare class CreateTimelineBlockDto {
    title: string;
    description?: string;
    durationMs?: number;
    order?: number;
    linkedScene?: string;
    intercomTemplateId?: string;
}
export declare class UpdateTimelineBlockDto extends CreateTimelineBlockDto {
}
export declare class ReorderBlocksDto {
    blockIds: string[];
}
