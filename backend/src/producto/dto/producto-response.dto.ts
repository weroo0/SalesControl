import { ApiProperty } from '@nestjs/swagger';

export class ProductoResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Identificador del producto',
  })
  id!: number;

  @ApiProperty({
    example: 'Perfume',
    description: 'Nombre del producto',
  })
  nombre!: string;

  @ApiProperty({
    type: String,
    example: '250.50',
    description: 'Precio de venta en MXN',
  })
  precio!: string;

  @ApiProperty({
    example: 1,
    description: 'Identificador de la categoría',
  })
  categoriaId!: number;

  @ApiProperty({
    example: true,
    description: 'Indica si el producto está activo',
  })
  activo!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-09T16:30:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt!: string;
}
