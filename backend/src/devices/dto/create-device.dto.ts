import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  PRODUCT_TYPES,
  ProductType,
  SERIAL_REQUIRED_PRODUCT_TYPES,
} from '../../common/constants';

export class DeviceRegistrationDto {
  @ApiProperty({
    enum: PRODUCT_TYPES,
    example: 'LAPTOP',
    description: 'One of DESKTOP_COMPUTER, LAPTOP, MOBILE_PHONE, TABLET, OTHER.',
  })
  @IsString({ message: 'Product type must be text.' })
  @IsNotEmpty({ message: 'Product type is required.' })
  @IsIn(PRODUCT_TYPES, {
    message: `Product type must be one of: ${PRODUCT_TYPES.join(', ')}.`,
  })
  productType: ProductType;

  @ApiProperty({ example: 'ThinkPad X1 Carbon' })
  @IsString({ message: 'Product name must be text.' })
  @IsNotEmpty({ message: 'Product name is required.' })
  @MaxLength(120, { message: 'Product name must be at most 120 characters.' })
  productName: string;

  @ApiPropertyOptional({ example: 'Lenovo' })
  @IsOptional()
  @IsString({ message: 'Brand must be text.' })
  @MaxLength(80, { message: 'Brand must be at most 80 characters.' })
  brand?: string;

  @ApiPropertyOptional({ example: 'X1 Carbon Gen 11' })
  @IsOptional()
  @IsString({ message: 'Model must be text.' })
  @MaxLength(80, { message: 'Model must be at most 80 characters.' })
  model?: string;

  /**
   * Mandatory for computers, laptops, mobile phones and tablets; optional
   * for `OTHER`. ValidateIf makes the remaining validators no-ops when the
   * product type does not require a serial number.
   */
  @ApiPropertyOptional({ example: 'TB380VM-4V10001' })
  @ValidateIf((dto: DeviceRegistrationDto) =>
    SERIAL_REQUIRED_PRODUCT_TYPES.includes(dto.productType),
  )
  @IsString({ message: 'Serial number must be text.' })
  @IsNotEmpty({
    message:
      'Serial number is required for desktop computers, laptops, mobile phones and tablets.',
  })
  @MaxLength(120, { message: 'Serial number must be at most 120 characters.' })
  serialNumber?: string;

  @ApiPropertyOptional({ example: 'Screen has a small scratch on the lid.' })
  @IsOptional()
  @IsString({ message: 'Description must be text.' })
  @MaxLength(500, { message: 'Description must be at most 500 characters.' })
  description?: string;
}
