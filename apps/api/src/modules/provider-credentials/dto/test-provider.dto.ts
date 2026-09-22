import { IsString, MaxLength, MinLength } from 'class-validator';

export class TestProviderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(320)
  recipient!: string;
}
