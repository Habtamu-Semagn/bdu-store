import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  RELEASE_STATUS_VALUES,
  STORAGE_STATUS_VALUES,
} from '../../common/constants';

export class RejectionReasonDto {
  @ApiProperty({
    example: 'Serial number does not match the device presented at the counter.',
  })
  @IsString({ message: 'Rejection reason must be text.' })
  @IsNotEmpty({ message: 'A rejection reason is required.' })
  @MinLength(3, { message: 'Rejection reason must be at least 3 characters long.' })
  @MaxLength(300, { message: 'Rejection reason must be at most 300 characters long.' })
  rejectionReason: string;
}

export class StorageRequestQueryDto {
  @ApiPropertyOptional({ enum: STORAGE_STATUS_VALUES, default: 'PENDING' })
  @IsOptional()
  @IsString()
  @IsIn(STORAGE_STATUS_VALUES, {
    message: `status must be one of: ${STORAGE_STATUS_VALUES.join(', ')}.`,
  })
  status?: string;
}

export class ReleaseRequestQueryDto {
  @ApiPropertyOptional({ enum: RELEASE_STATUS_VALUES, default: 'PENDING' })
  @IsOptional()
  @IsString()
  @IsIn(RELEASE_STATUS_VALUES, {
    message: `status must be one of: ${RELEASE_STATUS_VALUES.join(', ')}.`,
  })
  status?: string;
}
