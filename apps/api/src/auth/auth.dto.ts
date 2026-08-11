import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'diego@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 12, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password!: string;
}

export class AuthSessionResponseDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  authenticated!: boolean;

  @ApiProperty({ nullable: true, example: 'diego@example.com' })
  email!: string | null;
}
