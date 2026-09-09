import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Estado, Prisma, TipoVenta } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePagoDto } from './dto/create-pago.dto.js';

@Injectable()
export class PagoService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularSaldoCliente(clienteId: number) {
    const ventas = await this.prisma.venta.aggregate({
      _sum: {
        total: true,
      },
      where: {
        clienteId,
        tipoVenta: TipoVenta.FIADO,
        estado: Estado.ACTIVA,
      },
    });

    const pagos = await this.prisma.pago.aggregate({
      _sum: {
        monto: true,
      },
      where: {
        clienteId,
        estado: Estado.ACTIVA,
      },
    });

    const totalVentas = ventas._sum.total ?? new Prisma.Decimal(0);

    const totalPagos = pagos._sum.monto ?? new Prisma.Decimal(0);
    console.log(totalVentas);

    return totalVentas.sub(totalPagos);
  }

  async create(createPagoDto: CreatePagoDto, usuarioId: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: {
        id: createPagoDto.clienteId,
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (!cliente.activo) {
      throw new ConflictException(
        'No se puede registrar un pago para un cliente inactivo',
      );
    }

    const saldoPendiente = await this.calcularSaldoCliente(
      createPagoDto.clienteId,
    );

    if (saldoPendiente.lessThanOrEqualTo(0)) {
      throw new ConflictException('El cliente no tiene saldo pendiente');
    }

    const montoPago = new Prisma.Decimal(createPagoDto.monto);

    if (montoPago.greaterThan(saldoPendiente)) {
      throw new BadRequestException(
        'El pago no puede ser mayor al saldo pendiente',
      );
    }

    console.log(saldoPendiente);

    return this.prisma.pago.create({
      data: {
        clienteId: createPagoDto.clienteId,
        usuarioId,
        monto: montoPago,
        metodoPago: createPagoDto.metodoPago,
        notas: createPagoDto.notas,
        estado: Estado.ACTIVA,
      },
    });
  }
}
