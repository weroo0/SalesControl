import { ApiProperty } from '@nestjs/swagger';

export class PeriodoCobranzaDto {
  @ApiProperty({ type: String, format: 'date-time' })
  inicio!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  fin!: string;
}

export class ResumenCobranzaDto {
  @ApiProperty({ example: 5 })
  clientesConDeuda!: number;

  @ApiProperty({ example: 3 })
  clientesConDeudaQuePagaron!: number;

  @ApiProperty({ example: 2 })
  clientesConDeudaQueNoPagaron!: number;

  @ApiProperty({ example: '3500.00', type: String })
  totalPorCobrar!: string;

  @ApiProperty({ example: '1500.00', type: String })
  totalCobradoEstaSemana!: string;
}

export class ClienteConDeudaDto {
  @ApiProperty({ example: 10 })
  id!: number;

  @ApiProperty({ example: 'María Hernández' })
  nombre!: string;

  @ApiProperty({
    example: '7751234567',
    nullable: true,
    type: String,
  })
  telefono!: string | null;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty({ example: '1000.00', type: String })
  totalVentas!: string;

  @ApiProperty({ example: '400.00', type: String })
  totalPagos!: string;

  @ApiProperty({ example: '600.00', type: String })
  saldo!: string;

  @ApiProperty({ example: true })
  pagoEstaSemana!: boolean;

  @ApiProperty({ example: '200.00', type: String })
  totalPagadoEstaSemana!: string;
}

export class ClientesConDeudaResponseDto {
  @ApiProperty({ type: PeriodoCobranzaDto })
  periodo!: PeriodoCobranzaDto;

  @ApiProperty({ type: ResumenCobranzaDto })
  resumen!: ResumenCobranzaDto;

  @ApiProperty({ type: [ClienteConDeudaDto] })
  clientes!: ClienteConDeudaDto[];
}
