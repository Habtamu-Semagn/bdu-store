import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'bdu1504757' })
  @IsString({ message: 'University ID must be text.' })
  @IsNotEmpty({ message: 'University ID is required.' })
  universityId: string;

  @ApiProperty({ example: 'Secret123' })
  @IsString({ message: 'Password must be text.' })
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}
