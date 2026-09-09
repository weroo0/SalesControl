import { Body, Controller, Post, Req } from '@nestjs/common';
import { PagoService } from './pago.service.js';
import { CreatePagoDto } from './dto/create-pago.dto.js';
import type { RequestWithUser } from '../auth/types/auth.types.js';

@Controller('pagos')
export class PagoController {
  constructor(private readonly pagoService: PagoService) {}

  @Post()
  create(
    @Body() createPagoDto: CreatePagoDto,
    @Req() request: RequestWithUser,
  ) {
    return this.pagoService.create(createPagoDto, request.user.sub);
  }
}
