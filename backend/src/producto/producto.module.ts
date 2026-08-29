import { Module } from '@nestjs/common';
import { ProductoController } from './producto.controller.js';
import { ProductoService } from './producto.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ProductoController],
  providers: [ProductoService],
})
export class ProductoModule {}
