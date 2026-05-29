import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStepDto {
  @ApiProperty({ example: 'Welcome lesson' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ enum: ['draft', 'published'], default: 'draft' })
  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  @ApiPropertyOptional({ example: 'Start here.' })
  @IsOptional()
  @IsString()
  defaultContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smsContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegramContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailSubject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailBody?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 365 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  delayDaysOverride?: number;

  @ApiPropertyOptional({ enum: ['sms', 'telegram', 'email'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(['sms', 'telegram', 'email'], { each: true })
  channelOverrides?: Array<'sms' | 'telegram' | 'email'>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  replyRequiredPhrases?: string[];
}
