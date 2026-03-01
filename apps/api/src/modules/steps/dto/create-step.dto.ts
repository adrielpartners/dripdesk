import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStepDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  delayDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smsContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smsMediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegramContent?: string;

  @ApiPropertyOptional({ default: 'HTML' })
  @IsOptional()
  @IsString()
  telegramParseMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegramMediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappMediaType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappMediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailSubject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailHtmlContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailTextContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalLinkUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sendTimeOverride?: string;
}
