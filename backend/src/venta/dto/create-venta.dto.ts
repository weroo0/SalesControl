import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoVenta } from '../../../generated/prisma/enums.js';
import { CreateDetalleVentaDto } from './create-detalle-venta.dto.js';

export class CreateVentaDto {
  @IsInt()
  @IsPositive()
  clienteId!: number;

  @IsEnum(TipoVenta)
  @IsNotEmpty()
  tipoVenta!: TipoVenta;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleVentaDto)
  detalles!: CreateDetalleVentaDto[];
}
