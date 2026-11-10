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
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ProductoResponseDto } from './dto/producto-response.dto.js';
import {
  ProductoConCategoriaResponseDto,
  ProductosPaginadosResponseDto,
} from './dto/productos-paginados-response.dto.js';

@ApiTags('Productos')
@ApiBearerAuth('access-token')
@ApiResponse({
  status: 401,
  description: 'Token ausente o inválido.',
})
@ApiResponse({
  status: 403,
  description: 'Permisos insuficientes',
})
@Controller('productos')
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Registrar producto',
    description: 'Operación exclusiva del administrador',
  })
  @ApiCreatedResponse({
    description: 'Producto registrado correctamente',
    type: ProductoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto con el estado de la categoría',
  })
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productoService.create(createProductoDto);
  }

  @Roles(Role.ADMIN, Role.VENDEDOR)
  @Get()
  @ApiOperation({
    summary: 'Listar productos',
    description:
      'Consulta productos utiliando filtros por nombre, categoría, estado y paginación.',
  })
  @ApiOkResponse({
    description: 'Listado de productos obtenido correctamente.',
    type: ProductosPaginadosResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos.',
  })
  findAll(@Query() query: ProductoQueryDto) {
    return this.productoService.findAll(query);
  }

  @Roles(Role.ADMIN, Role.VENDEDOR)
  @Get(':id')
  @ApiOperation({
    summary: 'Consultar producto por ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Producto encontrado con su categoria.',
    type: ProductoConCategoriaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productoService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar producto',
    description: 'Operación exclusiva del administrador.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Producto actualizado correctamente.',
    type: ProductoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos o ID inválidos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Producto o categoría no encontrados.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto con el estado de la categoría.',
  })
  updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productoService.updateOne(id, updateProductoDto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/desactivar')
  @ApiOperation({
    summary: 'Desactivar producto',
    description: 'Operación exclusiva del administrador.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Producto desactivado correctamente.',
    type: ProductoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado.',
  })
  desactivateOne(@Param('id', ParseIntPipe) id: number) {
    return this.productoService.desactivateOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/activar')
  @ApiOperation({
    summary: 'Activar producto',
    description: 'Operación exclusiva del administrador.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Producto activado correctamente.',
    type: ProductoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado.',
  })
  activateOne(@Param('id', ParseIntPipe) id: number) {
    return this.productoService.activateOne(id);
  }
}
