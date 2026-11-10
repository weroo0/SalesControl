import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductoDto {
  @ApiProperty({
    example: 'Perfume',
    description: 'Nombre del producto',
    minLength: 1,
  })
  @Transform(({ value }) => {
    const rawValue: unknown = value;
    return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({
    type: Number,
    example: 250.5,
    minimum: 0,
    exclusiveMinimum: true,
    description: 'Precio de venta en MXN, positivo y con máximo dos decimales',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio!: number;

  @ApiProperty({
    type: Number,
    example: 1,
    minimum: 1,
    description: 'Identificador de la categoría del producto',
    minLength: 1,
  })
  @IsInt()
  @IsPositive()
  categoriaId!: number;
}
