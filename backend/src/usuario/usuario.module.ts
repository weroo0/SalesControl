import { Module } from '@nestjs/common';
import { UsuarioController } from './usuario.controller.js';
import { UsuarioService } from './usuario.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [UsuarioController],
  providers: [UsuarioService],
  exports: [UsuarioService],
})
export class UsuarioModule {}
