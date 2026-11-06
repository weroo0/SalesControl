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
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import type { RequestWithUser } from '../auth/types/auth.types.js';

@Roles(Role.ADMIN)
@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.findOne(id);
  }

  @Patch(':id')
  updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.usuarioService.updateOne(id, updateUsuarioDto);
  }

  @Patch(':id/desactivar')
  desactivateOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return this.usuarioService.desactivateOne(id, request.user.sub);
  }

  @Patch(':id/activar')
  activateOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.activateOne(id);
  }
}
