import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderStepsDto {
  @ApiProperty({ description: 'Step IDs in new order', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  stepIds: string[];
}
