import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreatePersonDto } from './create-person.dto';

export class ImportPersonsDto {
  @ApiProperty({ type: [CreatePersonDto] })
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => CreatePersonDto)
  persons: CreatePersonDto[];
}
