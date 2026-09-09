import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { TipoPago } from '../../../generated/prisma/enums.js';

export class CreatePagoDto {
  @IsNumber()
  @IsPositive()
  monto!: number;

  @IsEnum(TipoPago)
  metodoPago!: TipoPago;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsNumber()
  @IsPositive()
  clienteId!: number;
}
