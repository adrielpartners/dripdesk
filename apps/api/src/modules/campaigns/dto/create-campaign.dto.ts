import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus, ScheduleType, CompletionMode } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ScheduleType, default: 'DAILY' })
  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  @ApiPropertyOptional()
  @IsOptional()
  customSchedule?: Record<string, any>;

  @ApiPropertyOptional({ default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ default: '09:00' })
  @IsOptional()
  @IsString()
  sendTime?: string;

  @ApiPropertyOptional({ enum: CompletionMode, default: 'TIME_BASED' })
  @IsOptional()
  @IsEnum(CompletionMode)
  completionMode?: CompletionMode;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  completionDays?: number;

  @ApiProperty({ example: ['EMAIL', 'SMS'] })
  @IsArray()
  @IsIn(['SMS', 'EMAIL', 'TELEGRAM', 'WHATSAPP'], { each: true })
  channelsEnabled: string[];
}
