import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ClienteQueryDto {
  @ApiPropertyOptional({
    example: 'Luis',
    description: 'Filtrar clientes por nombre',
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
    type: Boolean,
    example: true,
    description: 'Filtrar clientes activos o inactivos',
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
    minimum: 1,
    maximum: 50,
    description: 'Número máximo de clientes por página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
