import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { VentaService } from './venta.service.js';
import { CreateVentaDto } from './dto/create-venta.dto.js';
import type { RequestWithUser } from '../auth/types/auth.types.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { VentaQueryDto } from './dto/venta-query.dto.js';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import {
  VentaBaseResponseDto,
  VentaCreadaResponseDto,
  VentaDetalleResponseDto,
  VentasPaginadasResponseDto,
} from './dto/venta-response.dto.js';

@Roles(Role.ADMIN, Role.VENDEDOR)
@ApiTags('Ventas')
@ApiBearerAuth('access-token')
@ApiResponse({
  status: 401,
  description: 'Token ausente o inválido.',
})
@ApiResponse({
  status: 403,
  description: 'Permisos insuficientes.',
})
@Controller('ventas')
export class VentaController {
  constructor(private readonly ventaService: VentaService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar venta',
    description:
      'Registra una venta CONTADO o FIADO. El backend calcula los precios, subtotales y total.',
  })
  @ApiCreatedResponse({
    description: 'Venta registrada correctamente.',
    type: VentaCreadaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o productos incorrectos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente o producto no encontrado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'No se puede vender a un cliente inactivo o utilizar productos inactivos',
  })
  create(
    @Body() createVentaDto: CreateVentaDto,
    @Req() request: RequestWithUser,
  ) {
    return this.ventaService.create(createVentaDto, request.user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar ventas',
    description:
      'Consulta las ventas utilizando filtros por cliente, vendedor, tipo, estado, fechas y paginación.',
  })
  @ApiOkResponse({
    description: 'Listado paginado de ventas.',
    type: VentasPaginadasResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos.',
  })
  findAll(@Query() query: VentaQueryDto) {
    return this.ventaService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar venta por ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Identificador de la venta',
  })
  @ApiOkResponse({
    description: 'Venta encontrada.',
    type: VentaDetalleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Venta no encontrada.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventaService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/cancelar')
  @ApiOperation({
    summary: 'Cancelar venta',
    description:
      'Cancela una venta registrada por error. Operación exclusiva del administrador.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Venta cancelada correctamente.',
    type: VentaBaseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Venta no encontrada.',
  })
  @ApiResponse({
    status: 409,
    description: 'La venta ya estaba cancelada.',
  })
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.ventaService.cancelar(id);
  }
}
