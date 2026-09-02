import { Body, Controller, Post, Req } from '@nestjs/common';
import { VentaService } from './venta.service.js';
import { CreateVentaDto } from './dto/create-venta.dto.js';
import type { RequestWithUser } from '../auth/types/auth.types.js';

@Controller('ventas')
export class VentaController {
  constructor(private readonly ventaService: VentaService) {}

  @Post()
  create(
    @Body() createVentaDto: CreateVentaDto,
    @Req() request: RequestWithUser,
  ) {
    return this.ventaService.create(createVentaDto, request.user.sub);
  }
}
