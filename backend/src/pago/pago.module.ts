import { Module } from '@nestjs/common';
import { PagoController } from './pago.controller.js';
import { PagoService } from './pago.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PagoController],
  providers: [PagoService],
})
export class PagoModule {}
