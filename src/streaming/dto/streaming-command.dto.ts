import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

export class StreamingCommandDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  sceneName?: string;

  @IsOptional()
  @IsObject()
  payload?: JsonValue;
}
