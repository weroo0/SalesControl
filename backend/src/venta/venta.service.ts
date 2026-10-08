import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVentaDto } from './dto/create-venta.dto.js';
import { Estado, Prisma } from '../../generated/prisma/client.js';
import { VentaQueryDto } from './dto/venta-query.dto.js';

@Injectable()
export class VentaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVentaDto: CreateVentaDto, usuarioId: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: {
        id: createVentaDto.clienteId,
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (!cliente.activo) {
      throw new ConflictException(
        'No se puede realizar una venta a un cliente inactivo',
      );
    }

    const idsOriginales = createVentaDto.detalles.map(
      (detalle) => detalle.productoId,
    );

    const productoIds = [...new Set(idsOriginales)];

    if (idsOriginales.length !== productoIds.length) {
      throw new BadRequestException(
        'No se puede repetir el mismo producto en la misma venta',
      );
    }

    const productos = await this.prisma.producto.findMany({
      where: {
        id: {
          in: productoIds,
        },
      },
    });

    if (productos.length !== productoIds.length) {
      throw new NotFoundException('Uno o más productos no existen');
    }

    const productoInactivo = productos.find((producto) => !producto.activo);

    if (productoInactivo) {
      throw new ConflictException(
        `El producto "${productoInactivo.nombre}" está inactivo`,
      );
    }

    const detallesCalculados = createVentaDto.detalles.map((detalle) => {
      const producto = productos.find(
        (producto) => producto.id === detalle.productoId,
      );

      if (!producto) {
        throw new NotFoundException('Producto no encontrado');
      }

      const subtotal = producto.precio.mul(detalle.cantidad);

      return {
        productoId: producto.id,
        cantidad: detalle.cantidad,
        precioUnitario: producto.precio,
        subtotal,
      };
    });

    const total = detallesCalculados.reduce(
      (acumulado, detalle) => acumulado.add(detalle.subtotal),
      new Prisma.Decimal(0),
    );

    return this.prisma.venta.create({
      data: {
        clienteId: createVentaDto.clienteId,
        usuarioId,
        tipoVenta: createVentaDto.tipoVenta,
        total,

        detalleVentas: {
          create: detallesCalculados,
        },
      },
      include: {
        cliente: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        detalleVentas: {
          include: {
            producto: true,
          },
        },
      },
    });
  }

  async findAll(query: VentaQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const skip = (page - 1) * limit;

    const where: Prisma.VentaWhereInput = {};

    if (query.clienteId !== undefined) {
      where.clienteId = query.clienteId;
    }

    if (query.usuarioId !== undefined) {
      where.usuarioId = query.usuarioId;
    }

    if (query.tipoVenta !== undefined) {
      where.tipoVenta = query.tipoVenta;
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
        'La fecha inicial no puede ser posterior a la final',
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
      where.fecha = fechaFilter;
    }

    const [ventas, total] = await this.prisma.$transaction([
      this.prisma.venta.findMany({
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
              email: true,
            },
          },

          detalleVentas: {
            include: {
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
      }),

      this.prisma.venta.count({
        where,
      }),
    ]);

    return {
      data: ventas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: {
        id,
      },

      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
          },
        },

        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },

        detalleVentas: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (!venta) {
      throw new NotFoundException('Venta no encontrada');
    }

    return venta;
  }

  async cancelar(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
    });

    if (!venta) {
      throw new NotFoundException('Venta no encontrada');
    }

    if (venta.estado === Estado.CANCELADA) {
      throw new ConflictException('La venta ya se encuentra cancelada');
    }

    return this.prisma.venta.update({
      where: { id },
      data: {
        estado: Estado.CANCELADA,
      },
    });
  }
}
