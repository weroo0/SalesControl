import { Module } from '@nestjs/common';
import { CategoriaController } from './categoria.controller.js';
import { CategoriaService } from './categoria.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriaController],
  providers: [CategoriaService],
})
export class CategoriaModule {}
