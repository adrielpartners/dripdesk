import { ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
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
export class CampaignScheduleConfig {
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'sendTime must be a 24-hour HH:mm time' })
  sendTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  intervalDays?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn([0, 1, 2, 3, 4, 5, 6], { each: true })
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
  @ValidateNested()
  @Type(() => CampaignScheduleConfig)
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
