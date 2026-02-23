import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateHardwareMappingDto {
    @IsString()
    @IsNotEmpty()
    mapKey: string;

    @IsUUID()
    @IsNotEmpty()
    ruleId: string;
}
