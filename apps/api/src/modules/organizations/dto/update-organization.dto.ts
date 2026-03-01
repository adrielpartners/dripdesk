import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';
import { EmailProvider } from '@prisma/client';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twilioAccountSid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twilioAuthToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twilioPhoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegramBotToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappBusinessId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappPhoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  smtpPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpUser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @ApiPropertyOptional({ enum: EmailProvider })
  @IsOptional()
  @IsEnum(EmailProvider)
  emailProvider?: EmailProvider;
}
