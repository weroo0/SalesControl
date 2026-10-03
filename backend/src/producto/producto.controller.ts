import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ProductoService } from './producto.service.js';
import { CreateProductoDto } from './dto/create-producto.dto.js';
import { UpdateProductoDto } from './dto/update-producto.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { ProductoQueryDto } from './dto/producto-query.dto.js';

@Controller('productos')
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productoService.create(createProductoDto);
  }

  @Roles(Role.ADMIN, Role.VENDEDOR)
  @Get()
  findAll(@Query() query: ProductoQueryDto) {
    return this.productoService.findAll(query);
  }

  @Roles(Role.ADMIN, Role.VENDEDOR)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productoService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productoService.updateOne(id, updateProductoDto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/desactivar')
  desactivateOne(@Param('id', ParseIntPipe) id: number) {
    return this.productoService.desactivateOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/activar')
  activateOne(@Param('id', ParseIntPipe) id: number) {
    return this.productoService.activateOne(id);
  }
}
