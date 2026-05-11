import { IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class LoginWithTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
