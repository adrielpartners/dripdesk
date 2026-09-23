import { IsEmail, IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteAdminDto {
  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: 'admin' })
  @IsOptional()
  @IsIn(['admin'])
  role?: 'admin';
}
