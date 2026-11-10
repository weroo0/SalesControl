import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Estado, TipoPago } from '../../../generated/prisma/client.js';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PagoQueryDto {
  @ApiPropertyOptional({
    type: Number,
    example: 10,
    minimum: 1,
    description: 'Filtrar pagos por cliente',
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
    description: 'Filtrar pagos por usuario que registró el pago',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usuarioId?: number;

  @ApiPropertyOptional({
    enum: TipoPago,
    enumName: 'TipoPago',
    description: 'Filtrar por método de pago',
  })
  @IsOptional()
  @IsEnum(TipoPago)
  metodoPago?: TipoPago;

  @ApiPropertyOptional({
    enum: Estado,
    enumName: 'Estado',
    description: 'Filtrar por estado del pago',
  })
  @IsOptional()
  @IsEnum(Estado)
  estado?: Estado;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-11-01',
    description: 'Fecha inicial inclusiva, hora de México',
  })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaDesde?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-11-09',
    description: 'Fecha final inclusiva, hora de México',
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
    description: 'Página solicitada',
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
    description: 'Registros máximos por página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
