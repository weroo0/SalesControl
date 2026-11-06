import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Estado, Prisma, TipoVenta } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePagoDto } from './dto/create-pago.dto.js';
import { PagoQueryDto } from './dto/pago-query.dto.js';

@Injectable()
export class PagoService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularSaldoCliente(
    clienteId: number,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const ventas = await db.venta.aggregate({
      _sum: {
        total: true,
      },
      where: {
        clienteId,
        tipoVenta: TipoVenta.FIADO,
        estado: Estado.ACTIVA,
      },
    });

    const pagos = await db.pago.aggregate({
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

    return totalVentas.sub(totalPagos);
  }
  private esConflictoSerializacion(error: unknown): boolean {
    let actual: unknown = error;

    for (let nivel = 0; nivel < 6; nivel++) {
      if (typeof actual !== 'object' || actual === null) {
        return false;
      }

      if ('code' in actual && actual.code === 'P2034') {
        return true;
      }

      if ('originalCode' in actual && actual.originalCode === '40001') {
        return true;
      }

      if ('kind' in actual && actual.kind === 'TransactionWriteConflict') {
        return true;
      }

      if (!('cause' in actual)) {
        return false;
      }

      actual = actual.cause;
    }

    return false;
  }

  async create(createPagoDto: CreatePagoDto, usuarioId: number) {
    const maxIntentos = 3;

    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const cliente = await tx.cliente.findUnique({
              where: {
                id: createPagoDto.clienteId,
              },
            });

            if (!cliente) {
              throw new NotFoundException('Cliente no encontrado');
            }

            const saldoPendiente = await this.calcularSaldoCliente(
              createPagoDto.clienteId,
              tx,
            );

            if (saldoPendiente.lessThanOrEqualTo(0)) {
              throw new ConflictException(
                'El cliente no tiene saldo pendiente',
              );
            }

            const montoPago = new Prisma.Decimal(createPagoDto.monto);

            if (montoPago.greaterThan(saldoPendiente)) {
              throw new BadRequestException(
                'El pago no puede ser mayor al saldo pendiente',
              );
            }

            return tx.pago.create({
              data: {
                clienteId: createPagoDto.clienteId,
                usuarioId,
                monto: montoPago,
                metodoPago: createPagoDto.metodoPago,
                notas: createPagoDto.notas,
                estado: Estado.ACTIVA,
              },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error: unknown) {
        if (!this.esConflictoSerializacion(error)) {
          throw error;
        }

        console.log(
          `Conflicto de serialización. Reintento ${intento}/${maxIntentos}`,
        );

        if (intento === maxIntentos) {
          throw new ConflictException(
            'El pago no pudo procesarse por operaciones simultaneas. Intentar de nuevo.',
          );
        }
      }
    }
  }

  async findAll(query: PagoQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const skip = (page - 1) * limit;

    const where: Prisma.PagoWhereInput = {};

    if (query.clienteId !== undefined) {
      where.clienteId = query.clienteId;
    }

    if (query.usuarioId !== undefined) {
      where.usuarioId = query.usuarioId;
    }

    if (query.metodoPago !== undefined) {
      where.metodoPago = query.metodoPago;
    }

    if (query.estado !== undefined) {
      where.estado = query.estado;
    }

    if (
      query.fechaDesde &&
      query.fechaHasta &&
      query.fechaDesde > query.fechaHasta
    ) {
      throw new BadRequestException(
        'La fechaDesde no puede ser posterior a fechaHasta',
      );
    }

    const fechaFilter: Prisma.DateTimeFilter = {};

    if (query.fechaDesde) {
      fechaFilter.gte = new Date(`${query.fechaDesde}T00:00:00`);
    }

    if (query.fechaHasta) {
      const fechaHasta = new Date(`${query.fechaHasta}T00:00:00`);
      fechaHasta.setDate(fechaHasta.getDate() + 1);

      fechaFilter.lt = fechaHasta;
    }

    if (query.fechaDesde || query.fechaHasta) {
      where.fechaPago = fechaFilter;
    }

    const [pagos, total] = await this.prisma.$transaction([
      this.prisma.pago.findMany({
        where,
        skip,
        take: limit,

        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
            },
          },

          usuario: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },

        orderBy: {
          fechaPago: 'desc',
        },
      }),

      this.prisma.pago.count({
        where,
      }),
    ]);

    return {
      data: pagos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return pago;
  }

  async cancelar(id: number) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (pago.estado === Estado.CANCELADA) {
      throw new ConflictException('El pago ya está cancelado');
    }

    return this.prisma.pago.update({
      where: { id },
      data: {
        estado: Estado.CANCELADA,
      },
    });
  }
}
