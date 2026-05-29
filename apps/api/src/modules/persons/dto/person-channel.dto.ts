import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonChannelDto {
  @ApiProperty({ enum: ['sms', 'telegram', 'email'] })
  @IsIn(['sms', 'telegram', 'email'])
  channelType!: 'sms' | 'telegram' | 'email';

  @ApiProperty({ example: 'person@example.com' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

