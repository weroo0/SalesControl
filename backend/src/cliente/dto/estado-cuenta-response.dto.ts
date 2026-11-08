import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class EstadoCuentaClienteDto {
  @ApiProperty({ example: 10 })
  id!: number;

  @ApiProperty({ example: 'María Hernández' })
  nombre!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '7751234567',
  })
  telefono!: string | null;

  @ApiProperty({ example: true })
  activo!: boolean;
}

export class EstadoCuentaProductoDto {
  @ApiProperty({ example: 5 })
  id!: number;

  @ApiProperty({ example: 'Perfume' })
  nombre!: string;
}

export class EstadoCuentaDetalleVentaDto {
  @ApiProperty({ example: 2 })
  cantidad!: number;

  @ApiProperty({
    type: String,
    example: '150.00',
  })
  precioUnitario!: string;

  @ApiProperty({
    type: String,
    example: '300.00',
  })
  subtotal!: string;

  @ApiProperty({
    type: EstadoCuentaProductoDto,
  })
  producto!: EstadoCuentaProductoDto;
}

export class MovimientoVentaDto {
  @ApiProperty({
    enum: ['VENTA'],
    example: 'VENTA',
  })
  tipo!: 'VENTA';

  @ApiProperty({ example: 15 })
  id!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  fecha!: string;

  @ApiProperty({
    type: String,
    example: '300.00',
  })
  monto!: string;

  @ApiProperty({
    type: String,
    example: '500.00',
    description: 'Saldo después del movimiento',
  })
  saldo!: string;

  @ApiProperty({
    type: [EstadoCuentaDetalleVentaDto],
  })
  detalle!: EstadoCuentaDetalleVentaDto[];
}

export class MovimientoPagoDto {
  @ApiProperty({
    enum: ['PAGO'],
    example: 'PAGO',
  })
  tipo!: 'PAGO';

  @ApiProperty({ example: 20 })
  id!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  fecha!: string;

  @ApiProperty({
    type: String,
    example: '200.00',
  })
  monto!: string;

  @ApiProperty({
    type: String,
    example: '300.00',
    description: 'Saldo después del movimiento',
  })
  saldo!: string;

  @ApiProperty({
    type: String,
    description: 'Método utilizado para realizar el pago',
    example: 'EFECTIVO',
  })
  metodoPago!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Abono semanal',
  })
  notas!: string | null;
}

export class EstadoCuentaResponseDto {
  @ApiProperty({
    type: EstadoCuentaClienteDto,
  })
  cliente!: EstadoCuentaClienteDto;

  @ApiProperty({
    type: String,
    example: '1000.00',
  })
  totalVentas!: string;

  @ApiProperty({
    type: String,
    example: '400.00',
  })
  totalPagos!: string;

  @ApiProperty({
    type: String,
    example: '600.00',
  })
  saldo!: string;

  @ApiProperty({
    type: 'array',
    description:
      'Movimientos activos ordenados del más reciente al más antiguo',
    items: {
      oneOf: [
        { $ref: getSchemaPath(MovimientoVentaDto) },
        { $ref: getSchemaPath(MovimientoPagoDto) },
      ],
    },
  })
  movimientos!: Array<MovimientoVentaDto | MovimientoPagoDto>;
}
