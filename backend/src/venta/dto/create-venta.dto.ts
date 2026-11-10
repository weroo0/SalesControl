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
import { ApiProperty } from '@nestjs/swagger';

export class CreateVentaDto {
  @ApiProperty({
    type: Number,
    example: 10,
    minimum: 1,
    description: 'Identificador del cliente',
  })
  @IsInt()
  @IsPositive()
  clienteId!: number;

  @ApiProperty({
    enum: TipoVenta,
    enumName: 'TipoVenta',
    example: TipoVenta.FIADO,
    description:
      'CONTADO: venta sin adeudo. FIADO: venta que incrementa la deuda del cliente.',
  })
  @IsEnum(TipoVenta)
  @IsNotEmpty()
  tipoVenta!: TipoVenta;

  @ApiProperty({
    type: [CreateDetalleVentaDto],
    minItems: 1,
    description: 'Productos incluidos en la venta. Debe contener al menos uno.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleVentaDto)
  detalles!: CreateDetalleVentaDto[];
}
