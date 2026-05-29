import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonChannelDto } from './person-channel.dto';

export class CreatePersonDto {
  @ApiProperty({ example: 'Jordan Lee' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  displayName!: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional({ example: ['vip', 'spring-cohort'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [PersonChannelDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonChannelDto)
  channels?: PersonChannelDto[];
}

