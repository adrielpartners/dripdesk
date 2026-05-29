import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty({ example: 'valid-invite-token-hex' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;
}