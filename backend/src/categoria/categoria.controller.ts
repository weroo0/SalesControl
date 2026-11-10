import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriaService } from './categoria.service.js';
import { CreateCategoriaDto } from './dto/create-categoria.dto.js';
import { UpdateCategoriaDto } from './dto/update-categoria.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { CategoriaResponseDto } from './dto/categoria-response.dto.js';

@Roles(Role.ADMIN)
@ApiTags('Categorias')
@ApiBearerAuth('access-token')
@ApiResponse({
  status: 401,
  description: 'Token ausente o inválido',
})
@ApiResponse({
  status: 403,
  description: 'Acceso exclusivo del administrador.',
})
@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Crear categoria',
  })
  @ApiCreatedResponse({
    description: 'Categoria creada correctamente',
    type: CategoriaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos.',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una categoria con ese nombre.',
  })
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriaService.create(createCategoriaDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar categorias',
    description: 'Obtiene las categorías registradas',
  })
  @ApiOkResponse({
    description: 'Listado de categorias obtenido correctamente',
    type: [CategoriaResponseDto],
  })
  findAll() {
    return this.categoriaService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar categoría por ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Identificador de la categoria',
  })
  @ApiOkResponse({
    description: 'Categoria encontrada',
    type: CategoriaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoría no encontrada',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar categoría',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Categoria actualizada correctamente',
    type: CategoriaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos o ID inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoría no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Nombre de categoria duplicado',
  })
  updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoriaDto: UpdateCategoriaDto,
  ) {
    return this.categoriaService.updateOne(id, updateCategoriaDto);
  }

  @Patch(':id/desactivar')
  @ApiOperation({
    summary: 'Desactivar categoría',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Categoria desactivada correctamente',
    type: CategoriaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Categoría ya desactivada',
  })
  desactivateOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriaService.desactivateOne(id);
  }

  @Patch(':id/activar')
  @ApiOperation({
    summary: 'Actualizar categoría',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Categoria activada correctamente',
    type: CategoriaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Categoría ya está activa',
  })
  activateOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriaService.activateOne(id);
  }
}
