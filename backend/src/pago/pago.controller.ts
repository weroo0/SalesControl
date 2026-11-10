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
import { PagoService } from './pago.service.js';
import { CreatePagoDto } from './dto/create-pago.dto.js';
import type { RequestWithUser } from '../auth/types/auth.types.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { PagoQueryDto } from './dto/pago-query.dto.js';
import {
  PagoBaseResponseDto,
  PagoConRelacionesResponseDto,
  PagosPaginadosResponseDto,
} from './dto/pago-response.dto.js';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';

@Roles(Role.ADMIN, Role.VENDEDOR)
@ApiTags('Pagos')
@ApiBearerAuth('access-token')
@ApiResponse({
  status: 401,
  description: 'Token ausente o inválido.',
})
@ApiResponse({
  status: 403,
  description: 'Permisos insuficientes.',
})
@Controller('pagos')
export class PagoController {
  constructor(private readonly pagoService: PagoService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar pago',
    description:
      'Registra un abono a la deuda de un cliente. El monto no puede superar el saldo pendiente.',
  })
  @ApiCreatedResponse({
    description: 'Pago registrado correctamente.',
    type: PagoBaseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o monto superior al saldo pendiente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'El cliente no tiene deuda o no fue posible resolver un conflicto entre operaciones simultáneas.',
  })
  create(
    @Body() createPagoDto: CreatePagoDto,
    @Req() request: RequestWithUser,
  ) {
    return this.pagoService.create(createPagoDto, request.user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar pagos',
    description:
      'Consulta pagos por cliente, usuario, método, estado, fechas y paginación.',
  })
  @ApiOkResponse({
    description: 'Listado paginado de pagos.',
    type: PagosPaginadosResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos.',
  })
  findAll(@Query() query: PagoQueryDto) {
    return this.pagoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar pago por ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Pago encontrado con sus relaciones.',
    type: PagoConRelacionesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Pago no encontrado.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagoService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/cancelar')
  @ApiOperation({
    summary: 'Cancelar pago',
    description:
      'Cancela un pago registrado por error. Operación exclusiva del administrador.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Pago cancelado correctamente.',
    type: PagoBaseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Pago no encontrado.',
  })
  @ApiResponse({
    status: 409,
    description: 'El pago ya está cancelado.',
  })
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.pagoService.cancelar(id);
  }
}
