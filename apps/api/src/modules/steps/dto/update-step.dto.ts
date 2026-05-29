import { IsIn, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateStepDto } from './create-step.dto';

export class UpdateStepDto extends PartialType(CreateStepDto) {
  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';
}

