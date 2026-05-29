import { IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type CampaignScheduleType =
  | 'daily'
  | 'weekdays'
  | 'monday_wednesday_friday'
  | 'custom_interval'
  | 'custom_days_of_week';
export type CampaignProgressRule = 'time_based' | 'link_click_required' | 'reply_required';
export type CampaignMode = 'standard' | 'advanced';
export type CampaignChannel = 'sms' | 'telegram' | 'email';
export interface CampaignScheduleConfig {
  sendTime?: string;
  intervalDays?: number;
  daysOfWeek?: number[];
}

export class CreateCampaignDto {
  @ApiProperty({ example: '7-day onboarding drip' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional({ example: 'Short lessons for the first week.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['daily', 'weekdays', 'monday_wednesday_friday', 'custom_interval', 'custom_days_of_week'] })
  @IsOptional()
  @IsIn(['daily', 'weekdays', 'monday_wednesday_friday', 'custom_interval', 'custom_days_of_week'])
  scheduleType?: CampaignScheduleType;

  @ApiPropertyOptional({ example: { sendTime: '09:00', intervalDays: 2, daysOfWeek: [1, 3, 5] } })
  @IsOptional()
  @IsObject()
  scheduleConfig?: CampaignScheduleConfig;

  @ApiPropertyOptional({ enum: ['time_based', 'link_click_required', 'reply_required'] })
  @IsOptional()
  @IsIn(['time_based', 'link_click_required', 'reply_required'])
  progressRule?: CampaignProgressRule;

  @ApiPropertyOptional({ enum: ['standard', 'advanced'] })
  @IsOptional()
  @IsIn(['standard', 'advanced'])
  mode?: CampaignMode;

  @ApiPropertyOptional({ enum: ['sms', 'telegram', 'email'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(['sms', 'telegram', 'email'], { each: true })
  defaultChannels?: CampaignChannel[];
}
