import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class SubscriberIntakeDto {
  @ApiProperty({ description: 'Unique event ID from the sending platform, reused unchanged on retries' })
  @IsString() @IsNotEmpty() @MaxLength(160)
  eventId!: string;

  @ApiProperty()
  @IsUUID()
  campaignId!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(160)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail() @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({ example: '+15551234567' })
  @IsOptional() @Matches(/^\+[1-9]\d{1,14}$/)
  phone?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional() @Matches(/^-?\d{3,20}$/)
  telegramChatId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Sender attests that the subscriber consented to receive campaign messages', example: true })
  @Transform(({ obj }) => obj.consent, { toClassOnly: true })
  @IsBoolean() @IsIn([true])
  consent!: true;
}
