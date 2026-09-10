import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { UpdateClienteDto } from './dto/update-cliente.dto.js';
import { Estado, TipoVenta } from '../../generated/prisma/client.js';

@Injectable()
export class ClienteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClienteDto) {
    return this.prisma.cliente.create({
      data: {
        nombre: createClientDto.nombre,
        telefono: createClientDto.telefono,
        direccion: createClientDto.direccion,
        notas: createClientDto.notas,
      },
    });
  }

  async findAll() {
    return this.prisma.cliente.findMany({
      where: {
        activo: true,
      },
    });
  }

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return cliente;
  }

  async updateOne(id: number, updateClienteDto: UpdateClienteDto) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: updateClienteDto,
    });
  }

  async desactivateOne(id: number) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: {
        activo: false,
      },
    });
  }

  async activateOne(id: number) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: {
        activo: true,
      },
    });
  }

  async estadoCuenta(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        activo: true,
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const ventas = await this.prisma.venta.findMany({
      where: {
        clienteId: id,
        tipoVenta: TipoVenta.FIADO,
        estado: Estado.ACTIVA,
      },
      select: {
        id: true,
        total: true,
        fecha: true,
        detalleVentas: {
          select: {
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
            producto: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: {
        fecha: 'desc',
      },
    });

    const pagos = await this.prisma.pago.findMany({
      where: {
        clienteId: id,
        estado: Estado.ACTIVA,
      },
      select: {
        id: true,
        monto: true,
        metodoPago: true,
        fechaPago: true,
        notas: true,
      },
      orderBy: {
        fechaPago: 'desc',
      },
    });

    const totalVentas = ventas.reduce(
      (total, venta) => total.add(venta.total),
      new Prisma.Decimal(0),
    );

    const totalPagos = pagos.reduce(
      (total, pago) => total.add(pago.monto),
      new Prisma.Decimal(0),
    );

    const saldo = totalVentas.sub(totalPagos);

    const movimientos = [
      ...ventas.map((venta) => ({
        tipo: 'VENTA' as const,
        id: venta.id,
        fecha: venta.fecha,
        monto: venta.total,
        detalle: venta.detalleVentas,
      })),

      ...pagos.map((pago) => ({
        tipo: 'PAGO' as const,
        id: pago.id,
        fecha: pago.fechaPago,
        monto: pago.monto,
        metodoPago: pago.metodoPago,
        notas: pago.notas,
      })),
    ];

    movimientos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    return {
      cliente,
      totalVentas,
      totalPagos,
      saldo,
      ventas,
      pagos,
      movimientos,
    };
  }
}
