import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Estado, TipoVenta } from '../../../generated/prisma/enums.js';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class VentaQueryDto {
  @ApiPropertyOptional({
    type: Number,
    example: 10,
    minimum: 1,
    description: 'Filtrar ventas por cliente',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 2,
    minimum: 1,
    description: 'Filtrar ventas por usuario vendedor',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usuarioId?: number;

  @ApiPropertyOptional({
    enum: TipoVenta,
    enumName: 'TipoVenta',
    description: 'Filtrar ventas CONTADO o FIADO',
  })
  @IsOptional()
  @IsEnum(TipoVenta)
  tipoVenta?: TipoVenta;

  @ApiPropertyOptional({
    enum: Estado,
    enumName: 'Estado',
    description: 'Filtrar ventas activas o canceladas',
  })
  @IsOptional()
  @IsEnum(Estado)
  estado?: Estado;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-11-01',
    description: 'Fecha inicial, inclusive, en zona horaria de México',
  })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaDesde?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-11-09',
    description: 'Fecha final, inclusive, en zona horaria de México',
  })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaHasta?: string;

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
    example: 1,
    default: 1,
    minimum: 1,
    description: 'Número de página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
