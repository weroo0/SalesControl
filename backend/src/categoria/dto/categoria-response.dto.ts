import { ApiProperty } from '@nestjs/swagger';

export class CategoriaResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Identificador de la categoría',
  })
  id!: number;

  @ApiProperty({
    example: 'Alimentos',
    description: 'Nombre de la categoría',
  })
  nombre!: string;

  @ApiProperty({
    example: true,
    description: 'Indica si la categoría está activa',
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
