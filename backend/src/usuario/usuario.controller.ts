import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { UsuarioResponseDto } from './dto/usuario-response.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import type { RequestWithUser } from '../auth/types/auth.types.js';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';

@Roles(Role.ADMIN)
@ApiTags('Usuarios')
@ApiBearerAuth('access-token')
@ApiResponse({
  status: 401,
  description: 'Token ausente o inválido.',
})
@ApiResponse({
  status: 403,
  description: 'Acceso exclusivo del administrador.',
})
@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar usuario',
    description: 'Crea un usuario con las credenciales proporcionadas.',
  })
  @ApiCreatedResponse({
    description: 'Usuario registrado correctamente.',
    type: UsuarioResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos.',
  })
  @ApiResponse({
    status: 409,
    description: 'El correo ya está registrado.',
  })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar usuarios',
    description: 'Obtiene los usuarios registrados.',
  })
  @ApiOkResponse({
    description: 'Listado de usuarios obtenido correctamente.',
    type: [UsuarioResponseDto],
  })
  findAll() {
    return this.usuarioService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar usuario por ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Identificador del usuario',
  })
  @ApiOkResponse({
    description: 'Usuario encontrado.',
    type: UsuarioResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar usuario',
    description: 'Permite modificar el nombre o correo electrónico.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'Usuario actualizado correctamente.',
    type: UsuarioResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o actualización vacía.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
  @ApiResponse({
    status: 409,
    description: 'Correo electrónico duplicado.',
  })
  updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.usuarioService.updateOne(id, updateUsuarioDto);
  }

  @Patch(':id/desactivar')
  @ApiOperation({
    summary: 'Desactivar usuario',
    description:
      'Permite desactivar una cuenta, excepto la propia cuenta administradora y el último administrador activo.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 2,
  })
  @ApiOkResponse({
    description: 'Usuario desactivado correctamente.',
    type: UsuarioResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
  @ApiResponse({
    status: 403,
    description: 'No puedes desactivar tu propia cuenta.',
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya está desactivado',
  })
  desactivateOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return this.usuarioService.desactivateOne(id, request.user.sub);
  }

  @Patch(':id/activar')
  @ApiOperation({
    summary: 'Activar usuario',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 2,
  })
  @ApiOkResponse({
    description: 'Usuario activado correctamente.',
    type: UsuarioResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya está activado',
  })
  activateOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.activateOne(id);
  }
}
