import { ApiProperty } from '@nestjs/swagger';
import { Estado, TipoPago } from '../../../generated/prisma/enums.js';

export class PagoBaseResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10 })
  clienteId!: number;

  @ApiProperty({ example: 2 })
  usuarioId!: number;

  @ApiProperty({
    type: String,
    example: '150.50',
    description: 'Monto registrado en MXN',
  })
  monto!: string;

  @ApiProperty({
    enum: TipoPago,
    enumName: 'TipoPago',
  })
  metodoPago!: TipoPago;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  fechaPago!: string;

  @ApiProperty({
    enum: Estado,
    enumName: 'Estado',
  })
  estado!: Estado;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Abono semanal',
  })
  notas!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  createdAt!: string;
}

export class PagoClienteResumenDto {
  @ApiProperty({ example: 10 })
  id!: number;

  @ApiProperty({ example: 'María Hernández' })
  nombre!: string;
}

export class PagoUsuarioResumenDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'Administrador' })
  nombre!: string;
}

export class PagoConRelacionesResponseDto extends PagoBaseResponseDto {
  @ApiProperty({
    type: PagoClienteResumenDto,
  })
  cliente!: PagoClienteResumenDto;

  @ApiProperty({
    type: PagoUsuarioResumenDto,
  })
  usuario!: PagoUsuarioResumenDto;
}

export class PagosPaginadosResponseDto {
  @ApiProperty({
    type: [PagoConRelacionesResponseDto],
    description: 'Pagos de la página solicitada',
  })
  data!: PagoConRelacionesResponseDto[];

  @ApiProperty({
    example: 25,
    description: 'Total de registros coincidentes',
  })
  total!: number;

  @ApiProperty({
    example: 1,
    minimum: 1,
  })
  page!: number;

  @ApiProperty({
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  limit!: number;

  @ApiProperty({
    example: 3,
  })
  totalPages!: number;
}
