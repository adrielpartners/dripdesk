import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EnrollPersonDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  personId!: string;
}

export class EnrollCampaignDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campaignId!: string;
}
