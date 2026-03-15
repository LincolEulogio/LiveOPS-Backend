import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateGuestInvitationDto {
  @IsString()
  @IsOptional()
  guestName?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
