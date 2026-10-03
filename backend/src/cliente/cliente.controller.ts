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

@Roles(Role.ADMIN, Role.VENDEDOR)
@Controller('clientes')
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}

  @Post()
  create(@Body() createClienteDto: CreateClienteDto) {
    return this.clienteService.create(createClienteDto);
  }

  @Get()
  findAll(@Query() query: ClienteQueryDto) {
    return this.clienteService.findAll(query);
  }

  @Get('con-deuda')
  findConDeuda() {
    return this.clienteService.findConDeuda();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.findOne(id);
  }

  @Get(':id/estado-cuenta')
  estadoCuenta(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.estadoCuenta(id);
  }

  @Patch(':id')
  updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    return this.clienteService.updateOne(id, updateClienteDto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/desactivar')
  desactivateOne(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.desactivateOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/activar')
  activateOne(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.activateOne(id);
  }
}
