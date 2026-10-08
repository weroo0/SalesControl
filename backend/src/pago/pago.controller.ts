import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { PagoService } from './pago.service.js';
import { CreatePagoDto } from './dto/create-pago.dto.js';
import type { RequestWithUser } from '../auth/types/auth.types.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { PagoQueryDto } from './dto/pago-query.dto.js';

@Roles(Role.ADMIN, Role.VENDEDOR)
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

  @Get()
  findAll(@Query() query: PagoQueryDto) {
    return this.pagoService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagoService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/cancelar')
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.pagoService.cancelar(id);
  }
}
