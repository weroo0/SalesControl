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

@Roles(Role.ADMIN, Role.VENDEDOR)
@Controller('ventas')
export class VentaController {
  constructor(private readonly ventaService: VentaService) {}

  @Post()
  create(
    @Body() createVentaDto: CreateVentaDto,
    @Req() request: RequestWithUser,
  ) {
    return this.ventaService.create(createVentaDto, request.user.sub);
  }

  @Get()
  findAll(@Query() query: VentaQueryDto) {
    return this.ventaService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventaService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/cancelar')
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.ventaService.cancelar(id);
  }
}
