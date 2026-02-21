import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class StreamingCommandDto {
    @IsString()
    @IsNotEmpty()
    type: string;

    @IsOptional()
    @IsString()
    sceneName?: string;

    @IsOptional()
    @IsObject()
    payload?: any;
}
