import {
  IsEmail,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  IsPhoneNumber,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreatePersonDto {
  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+15551234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({ example: '+15551234567' })
  @IsOptional()
  @IsString()
  whatsappId?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: ['EMAIL', 'SMS'] })
  @IsOptional()
  @IsArray()
  @IsIn(['SMS', 'EMAIL', 'TELEGRAM', 'WHATSAPP'], { each: true })
  preferredChannels?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Tag IDs to assign' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
