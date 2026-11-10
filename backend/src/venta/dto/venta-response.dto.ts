import { ApiProperty } from '@nestjs/swagger';
import { Estado, TipoVenta } from '../../../generated/prisma/enums.js';
import { ClienteListadoDto } from '../../cliente/dto/clientes-paginados-response.dto.js';
import { ProductoResponseDto } from '../../producto/dto/producto-response.dto.js';

export class VentaBaseResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10 })
  clienteId!: number;

  @ApiProperty({ example: 2 })
  usuarioId!: number;

  @ApiProperty({
    enum: TipoVenta,
    enumName: 'TipoVenta',
  })
  tipoVenta!: TipoVenta;

  @ApiProperty({
    type: String,
    example: '450.00',
  })
  total!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  fecha!: string;

  @ApiProperty({
    enum: Estado,
    enumName: 'Estado',
  })
  estado!: Estado;
}

export class VentaUsuarioResumenDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'María Hernández' })
  nombre!: string;

  @ApiProperty({ example: 'maria@example.com' })
  email!: string;
}

export class VentaClienteResumenDto {
  @ApiProperty({ example: 10 })
  id!: number;

  @ApiProperty({ example: 'Juan Pérez' })
  nombre!: string;
}

export class VentaClienteConTelefonoDto extends VentaClienteResumenDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: '7751234567',
  })
  telefono!: string | null;
}

export class VentaProductoResumenDto {
  @ApiProperty({ example: 5 })
  id!: number;

  @ApiProperty({ example: 'Perfume' })
  nombre!: string;
}

export class DetalleVentaBaseResponseDto {
  @ApiProperty({ example: 15 })
  id!: number;

  @ApiProperty({ example: 1 })
  ventaId!: number;

  @ApiProperty({ example: 5 })
  productoId!: number;

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
}

export class DetalleVentaResumenResponseDto extends DetalleVentaBaseResponseDto {
  @ApiProperty({
    type: VentaProductoResumenDto,
  })
  producto!: VentaProductoResumenDto;
}

export class DetalleVentaCompletoResponseDto extends DetalleVentaBaseResponseDto {
  @ApiProperty({
    type: ProductoResponseDto,
  })
  producto!: ProductoResponseDto;
}

export class VentaCreadaResponseDto extends VentaBaseResponseDto {
  @ApiProperty({
    type: ClienteListadoDto,
  })
  cliente!: ClienteListadoDto;

  @ApiProperty({
    type: VentaUsuarioResumenDto,
  })
  usuario!: VentaUsuarioResumenDto;

  @ApiProperty({
    type: [DetalleVentaCompletoResponseDto],
  })
  detalleVentas!: DetalleVentaCompletoResponseDto[];
}

export class VentaDetalleResponseDto extends VentaBaseResponseDto {
  @ApiProperty({
    type: VentaClienteConTelefonoDto,
  })
  cliente!: VentaClienteConTelefonoDto;

  @ApiProperty({
    type: VentaUsuarioResumenDto,
  })
  usuario!: VentaUsuarioResumenDto;

  @ApiProperty({
    type: [DetalleVentaResumenResponseDto],
  })
  detalleVentas!: DetalleVentaResumenResponseDto[];
}

export class VentaListadoResponseDto extends VentaBaseResponseDto {
  @ApiProperty({
    type: VentaClienteResumenDto,
  })
  cliente!: VentaClienteResumenDto;

  @ApiProperty({
    type: VentaUsuarioResumenDto,
  })
  usuario!: VentaUsuarioResumenDto;

  @ApiProperty({
    type: [DetalleVentaResumenResponseDto],
  })
  detalleVentas!: DetalleVentaResumenResponseDto[];
}

export class VentasPaginadasResponseDto {
  @ApiProperty({
    type: [VentaListadoResponseDto],
  })
  data!: VentaListadoResponseDto[];

  @ApiProperty({ example: 25 })
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

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
