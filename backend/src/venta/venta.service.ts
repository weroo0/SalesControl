import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVentaDto } from './dto/create-venta.dto.js';
import { Prisma } from '../../generated/prisma/client.js';

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
        usuario: true,
        detalleVentas: {
          include: {
            producto: true,
          },
        },
      },
    });
  }
}
