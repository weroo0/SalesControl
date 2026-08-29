import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Param,
  Patch,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';

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
  desactivateOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.desactivateOne(id);
  }

  @Patch(':id/activar')
  activateOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.activateOne(id);
  }
}
