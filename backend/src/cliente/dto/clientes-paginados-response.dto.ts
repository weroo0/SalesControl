import { ApiProperty } from '@nestjs/swagger';

export class ClienteListadoDto {
  @ApiProperty({
    example: 1,
    description: 'Identificador del cliente',
  })
  id!: number;

  @ApiProperty({
    example: 'María Hernández',
  })
  nombre!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '7751234567',
  })
  telefono!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Colonia Centro',
  })
  direccion!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Cliente con cobranza semanal',
  })
  notas!: string | null;

  @ApiProperty({
    example: true,
  })
  activo!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-01T16:30:00.000Z',
  })
  createdAt!: string;
}

export class ClientesPaginadosResponseDto {
  @ApiProperty({
    type: [ClienteListadoDto],
    description: 'Clientes de la página solicitada',
  })
  data!: ClienteListadoDto[];

  @ApiProperty({
    example: 25,
    description: 'Total de clientes que coinciden con los filtros',
  })
  total!: number;

  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Página actual',
  })
  page!: number;

  @ApiProperty({
    example: 10,
    minimum: 1,
    maximum: 50,
    description: 'Cantidad máxima de registros por página',
  })
  limit!: number;

  @ApiProperty({
    example: 3,
    description: 'Número total de páginas',
  })
  totalPages!: number;
}
