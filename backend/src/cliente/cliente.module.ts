import { Module } from '@nestjs/common';
import { ClienteController } from './cliente.controller.js';
import { ClienteService } from './cliente.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ClienteController],
  providers: [ClienteService],
})
export class ClienteModule {}
