import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsMatchingField } from './university-id.validation';

export class RegisterDto {
  @ApiProperty({ example: 'Abebe Kebede', description: 'Full name of the campus resident.' })
  @IsString({ message: 'Full name must be text.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  @MaxLength(120, { message: 'Full name must be at most 120 characters.' })
  fullName: string;

  @ApiProperty({ example: 'bdu1504757', description: 'Unique Bahir Dar University ID.' })
  @IsString({ message: 'University ID must be text.' })
  @IsNotEmpty({ message: 'University ID is required.' })
  @MaxLength(60, { message: 'University ID must be at most 60 characters.' })
  universityId: string;

  @ApiProperty({ example: 'Secret123', minLength: 6 })
  @IsString({ message: 'Password must be text.' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  @MaxLength(72, { message: 'Password must be at most 72 characters long.' })
  @Matches(/\d/, { message: 'Password must contain at least one number.' })
  password: string;

  @ApiProperty({ example: 'Secret123' })
  @IsString({ message: 'Confirm password must be text.' })
  @IsNotEmpty({ message: 'Confirm password is required.' })
  @IsMatchingField('password', { message: 'Passwords do not match.' })
  confirmPassword: string;
}
