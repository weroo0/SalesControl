import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProductoQueryDto {
  @ApiPropertyOptional({
    example: 'Perfume',
    description: 'Filtrar productos por nombre',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    const rawValue: unknown = value;

    if (typeof rawValue === 'string') {
      return rawValue.trim();
    }

    return rawValue;
  })
  nombre?: string;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    minimum: 1,
    description: 'Filtrar productos por categoría',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoriaId?: number;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    description: 'Filtrar productos activos o inactivos',
  })
  @IsOptional()
  @Transform(({ value }) => {
    const rawValue: unknown = value;

    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;

    return rawValue;
  })
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    default: 1,
    minimum: 1,
    description: 'Número de página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
    description: 'Cantidad máxima de productos por página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
