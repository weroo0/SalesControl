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

    movimientos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    let saldoAcumulado = new Prisma.Decimal(0);

    const movimientosConSaldo = movimientos.map((movimiento) => {
      if (movimiento.tipo === 'VENTA') {
        saldoAcumulado = saldoAcumulado.add(movimiento.monto);
      } else {
        saldoAcumulado = saldoAcumulado.sub(movimiento.monto);
      }

      return {
        ...movimiento,
        saldo: saldoAcumulado,
      };
    });

    movimientosConSaldo.reverse();

    return {
      cliente,
      totalVentas,
      totalPagos,
      saldo,
      movimientos: movimientosConSaldo,
    };
  }

  async findConDeuda() {
    const ahora = new Date();

    const { inicio, fin } = this.obtenerCicloCobranza(ahora);

    const [ventas, pagos, pagosSemana] = await Promise.all([
      this.prisma.venta.groupBy({
        by: ['clienteId'],
        where: {
          tipoVenta: TipoVenta.FIADO,
          estado: Estado.ACTIVA,
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.pago.groupBy({
        by: ['clienteId'],
        where: {
          estado: Estado.ACTIVA,
        },
        _sum: {
          monto: true,
        },
      }),

      this.prisma.pago.groupBy({
        by: ['clienteId'],
        where: {
          estado: Estado.ACTIVA,
          fechaPago: {
            gte: inicio,
            lte: ahora,
          },
        },
        _sum: {
          monto: true,
        },
      }),
    ]);

    const clienteIds = ventas.map((venta) => venta.clienteId);

    const clientes = await this.prisma.cliente.findMany({
      where: {
        id: {
          in: clienteIds,
        },
      },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        activo: true,
      },
    });

    const ventasPorCliente = new Map(
      ventas.map((venta) => [
        venta.clienteId,
        venta._sum.total ?? new Prisma.Decimal(0),
      ]),
    );

    const pagosPorCliente = new Map(
      pagos.map((pago) => [
        pago.clienteId,
        pago._sum.monto ?? new Prisma.Decimal(0),
      ]),
    );

    const pagosSemanaPorCliente = new Map(
      pagosSemana.map((pago) => [
        pago.clienteId,
        pago._sum.monto ?? new Prisma.Decimal(0),
      ]),
    );

    const clientesConDeuda = clientes
      .map((cliente) => {
        const totalVentas =
          ventasPorCliente.get(cliente.id) ?? new Prisma.Decimal(0);

        const totalPagos =
          pagosPorCliente.get(cliente.id) ?? new Prisma.Decimal(0);

        const totalPagadoEstaSemana =
          pagosSemanaPorCliente.get(cliente.id) ?? new Prisma.Decimal(0);

        const saldo = totalVentas.sub(totalPagos);

        return {
          ...cliente,
          totalVentas,
          totalPagos,
          saldo,
          pagoEstaSemana: totalPagadoEstaSemana.greaterThan(0),
          totalPagadoEstaSemana,
        };
      })
      .filter((cliente) => cliente.saldo.greaterThan(0));

    const clientesConDeudaQuePagaron = clientesConDeuda.filter(
      (cliente) => cliente.pagoEstaSemana,
    ).length;

    const clientesConDeudaQueNoPagaron = clientesConDeuda.filter(
      (cliente) => !cliente.pagoEstaSemana,
    ).length;

    const totalPorCobrar = clientesConDeuda.reduce(
      (total, cliente) => total.add(cliente.saldo),
      new Prisma.Decimal(0),
    );

    const totalCobradoEstaSemana = pagosSemana.reduce(
      (total, pago) => total.add(pago._sum.monto ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0),
    );

    return {
      periodo: {
        inicio,
        fin,
      },

      resumen: {
        clientesConDeuda: clientesConDeuda.length,
        clientesConDeudaQuePagaron,
        clientesConDeudaQueNoPagaron,
        totalPorCobrar,
        totalCobradoEstaSemana,
      },

      clientes: clientesConDeuda,
    };
  }

  private obtenerCicloCobranza(fecha = new Date()) {
    const inicio = new Date(fecha);

    inicio.setHours(0, 0, 0, 0);

    const diasDesdeSabado = (inicio.getDay() + 1) % 7;

    inicio.setDate(inicio.getDate() - diasDesdeSabado);

    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);

    return {
      inicio,
      fin,
    };
  }
}
