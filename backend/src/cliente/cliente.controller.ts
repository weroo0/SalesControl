import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClienteService } from './cliente.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { UpdateClienteDto } from './dto/update-cliente.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { ClienteQueryDto } from './dto/cliente-query.dto.js';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ClientesConDeudaResponseDto } from './dto/clientes-con-deuda-response.dto.js';
import {
  EstadoCuentaResponseDto,
  MovimientoVentaDto,
  MovimientoPagoDto,
} from './dto/estado-cuenta-response.dto.js';
import { ClientesPaginadosResponseDto } from './dto/clientes-paginados-response.dto.js';

@Roles(Role.ADMIN, Role.VENDEDOR)
@ApiTags('Clientes')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Autenticación requerida.' })
@ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
@Controller('clientes')
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar un cliente',
  })
  @ApiCreatedResponse({
    description: 'Cliente registrado correctamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos del cliente inválidos.',
  })
  create(@Body() createClienteDto: CreateClienteDto) {
    return this.clienteService.create(createClienteDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar clientes',
    description:
      'Condulta clientes utilizando filtros por nombre, estado y paginación.',
  })
  @ApiOkResponse({
    description: 'Listado de clientes obtenido correctamente',
    type: ClientesPaginadosResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos',
  })
  findAll(@Query() query: ClienteQueryDto) {
    return this.clienteService.findAll(query);
  }
  @Get('con-deuda')
  @ApiOperation({
    summary: 'Consultar clientes con deuda',
    description:
      'Obtiene los clientes con saldo pendiente y el resumen de cobranza semanal',
  })
  @ApiOkResponse({
    description: 'Resumen de cobranza obtenido correctamente',
    type: ClientesConDeudaResponseDto,
  })
  findConDeuda() {
    return this.clienteService.findConDeuda();
  }
  @Get(':id')
  @ApiOperation({
    summary: 'Consultar cliente por ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 10,
  })
  @ApiOkResponse({
    description: 'Cliente encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.findOne(id);
  }

  @Get(':id/estado-cuenta')
  @ApiOperation({
    summary: 'Consultar estado de cuenta',
    description:
      'Consultar el estado de cuenta de un cliente, incluidos sus movimientos y saldo.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 10,
  })
  @ApiExtraModels(MovimientoVentaDto, MovimientoPagoDto)
  @ApiOkResponse({
    description: 'Estado de cuenta obtenido correctamente',
    type: EstadoCuentaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado',
  })
  estadoCuenta(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.estadoCuenta(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar datos de un cliente',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 10,
  })
  @ApiOkResponse({
    description: 'Cliente actualizado correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos o ID inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado',
  })
  updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    return this.clienteService.updateOne(id, updateClienteDto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/desactivar')
  @ApiOperation({
    summary: 'Desactivar un cliente',
    description: 'Operación exclusiva del administrador',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 10,
  })
  @ApiOkResponse({
    description: 'Cliente desactivado correctamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado',
  })
  desactivateOne(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.desactivateOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/activar')
  @ApiOperation({
    summary: 'Activar cliente',
    description: 'Operación exclusiva del administrador',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 10,
  })
  @ApiOkResponse({
    description: 'Cliente activado correctamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Datos o ID inválidos',
  })
  activateOne(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.activateOne(id);
  }
}
