import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { TipoPago } from '../../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePagoDto {
  @ApiProperty({
    type: Number,
    example: 150.5,
    description: 'Monto del pago en MXN. Debe ser mayor a cero.',
    minimum: 0,
    exclusiveMinimum: true,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto!: number;

  @ApiProperty({
    enum: TipoPago,
    enumName: 'TipoPago',
    description: 'Método utilizado para registrar el pago',
  })
  @IsEnum(TipoPago)
  metodoPago!: TipoPago;

  @ApiPropertyOptional({
    type: String,
    example: 'Abono semanal',
    description: 'Observaciones adicionales del pago',
  })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({
    type: Number,
    example: 10,
    minimum: 1,
    description: 'Identificador del cliente que realiza el pago',
  })
  @IsNumber()
  @IsPositive()
  clienteId!: number;
}
