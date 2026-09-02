import { Module } from '@nestjs/common';
import { VentaController } from './venta.controller.js';
import { VentaService } from './venta.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [VentaController],
  providers: [VentaService],
})
export class VentaModule {}
