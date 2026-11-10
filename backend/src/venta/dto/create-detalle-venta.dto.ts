import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDetalleVentaDto {
  @ApiProperty({
    type: Number,
    example: 5,
    minimum: 1,
    description: 'Identificador del producto vendido',
  })
  @IsInt()
  @IsPositive()
  productoId!: number;

  @ApiProperty({
    type: Number,
    example: 2,
    minimum: 1,
    description: 'Cantidad de unidades vendidas',
  })
  @IsInt()
  @IsPositive()
  cantidad!: number;
}
