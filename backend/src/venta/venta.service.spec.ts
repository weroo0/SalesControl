import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, TipoVenta, Estado } from '../../generated/prisma/client.js';

import { VentaService } from './venta.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CreateVentaDto } from './dto/create-venta.dto.js';

describe('VentaService - create', () => {
  let service: VentaService;

  // Cliente simulado
  let clienteExistente: {
    id: number;
    activo: boolean;
  } | null;

  // Productos simulados
  const crearProductos = () => [
    {
      id: 5,
      nombre: 'Perfume',
      precio: new Prisma.Decimal('199.90'),
      activo: true,
    },
    {
      id: 8,
      nombre: 'Alimentos',
      precio: new Prisma.Decimal('80.25'),
      activo: true,
    },
  ];

  let productosDisponibles = crearProductos();

  // Prisma simulado
  const prismaMock = {
    cliente: {
      findUnique: jest.fn(async (_args: unknown) => {
        return clienteExistente;
      }),
    },

    producto: {
      findMany: jest.fn(async (_args: unknown) => {
        return productosDisponibles;
      }),
    },

    venta: {
      create: jest.fn(async (_args: unknown) => {
        return { id: 100 };
      }),
    },
  };

  // Datos de una venta válida
  const dto: CreateVentaDto = {
    clienteId: 10,
    tipoVenta: TipoVenta.FIADO,
    detalles: [
      {
        productoId: 5,
        cantidad: 2,
      },
      {
        productoId: 8,
        cantidad: 3,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    clienteExistente = {
      id: 10,
      activo: true,
    };

    productosDisponibles = crearProductos();

    service = new VentaService(prismaMock as unknown as PrismaService);
  });

  // PRUEBA 1
  it('debe rechazar una venta si el cliente no existe', async () => {
    clienteExistente = null;

    await expect(service.create(dto, 2)).rejects.toThrow(NotFoundException);

    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  // PRUEBA 2
  it('debe rechazar una venta a un cliente inactivo', async () => {
    clienteExistente = {
      id: 10,
      activo: false,
    };

    await expect(service.create(dto, 2)).rejects.toThrow(ConflictException);

    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  // PRUEBA 3
  it('debe rechazar productos repetidos en una misma venta', async () => {
    const ventaDuplicada: CreateVentaDto = {
      ...dto,
      detalles: [
        { productoId: 5, cantidad: 1 },
        { productoId: 5, cantidad: 3 },
      ],
    };

    await expect(service.create(ventaDuplicada, 2)).rejects.toThrow(
      BadRequestException,
    );

    expect(prismaMock.producto.findMany).not.toHaveBeenCalled();
    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  // PRUEBA 4
  it('debe rechazar una venta con productos inexistentes', async () => {
    // Solo se encuentra uno de los dos productos.
    productosDisponibles = crearProductos().slice(0, 1);

    await expect(service.create(dto, 2)).rejects.toThrow(NotFoundException);

    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  // PRUEBA 5
  it('debe rechazar una venta con productos inactivos', async () => {
    productosDisponibles = crearProductos().map((producto) =>
      producto.id === 5 ? { ...producto, activo: false } : producto,
    );

    await expect(service.create(dto, 2)).rejects.toThrow(ConflictException);

    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  // PRUEBA 6
  it('debe calcular y registrar correctamente una venta válida', async () => {
    const resultado = await service.create(dto, 2);

    expect(prismaMock.venta.create).toHaveBeenCalledTimes(1);

    // Recuperamos los argumentos enviados a Prisma.
    const argumentos = prismaMock.venta.create.mock.calls[0]?.[0] as {
      data: {
        clienteId: number;
        usuarioId: number;
        tipoVenta: TipoVenta;
        total: Prisma.Decimal;
        detalleVentas: {
          create: {
            productoId: number;
            cantidad: number;
            precioUnitario: Prisma.Decimal;
            subtotal: Prisma.Decimal;
          }[];
        };
      };
    };

    expect(argumentos.data.clienteId).toBe(10);
    expect(argumentos.data.usuarioId).toBe(2);
    expect(argumentos.data.tipoVenta).toBe(TipoVenta.FIADO);

    // 199.90 × 2 + 80.25 × 3 = 640.55
    expect(argumentos.data.total.equals('640.55')).toBe(true);

    const detalles = argumentos.data.detalleVentas.create;

    expect(detalles).toHaveLength(2);

    expect(detalles[0]?.precioUnitario.equals('199.90')).toBe(true);
    expect(detalles[0]?.subtotal.equals('399.80')).toBe(true);

    expect(detalles[1]?.precioUnitario.equals('80.25')).toBe(true);
    expect(detalles[1]?.subtotal.equals('240.75')).toBe(true);

    expect(resultado).toEqual({ id: 100 });
  });
});

describe('VentaService - cancelar', () => {
  let service: VentaService;

  // Venta que simulará encontrar Prisma
  let ventaExistente: {
    id: number;
    estado: Estado;
  } | null;

  const prismaMock = {
    venta: {
      findUnique: jest.fn(async (_args: unknown) => {
        return ventaExistente;
      }),

      update: jest.fn(async (_args: unknown) => {
        return {
          id: 100,
          estado: Estado.CANCELADA,
        };
      }),

      delete: jest.fn(async (_args: unknown) => {
        return { id: 100 };
      }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Cada prueba comienza con una venta activa
    ventaExistente = {
      id: 100,
      estado: Estado.ACTIVA,
    };

    service = new VentaService(prismaMock as unknown as PrismaService);
  });

  // PRUEBA 1
  it('debe rechazar la cancelación de una venta inexistente', async () => {
    // Arrange
    ventaExistente = null;

    // Act y Assert
    await expect(service.cancelar(100)).rejects.toThrow(NotFoundException);

    expect(prismaMock.venta.findUnique).toHaveBeenCalledWith({
      where: { id: 100 },
    });

    expect(prismaMock.venta.update).not.toHaveBeenCalled();
  });

  // PRUEBA 2
  it('debe rechazar una venta que ya está cancelada', async () => {
    // Arrange
    ventaExistente = {
      id: 100,
      estado: Estado.CANCELADA,
    };

    // Act y Assert
    await expect(service.cancelar(100)).rejects.toThrow(ConflictException);

    expect(prismaMock.venta.update).not.toHaveBeenCalled();
  });

  // PRUEBA 3
  it('debe cancelar correctamente una venta activa', async () => {
    // Act
    const resultado = await service.cancelar(100);

    // Assert
    expect(prismaMock.venta.findUnique).toHaveBeenCalledWith({
      where: { id: 100 },
    });

    expect(prismaMock.venta.update).toHaveBeenCalledTimes(1);

    expect(prismaMock.venta.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: {
        estado: Estado.CANCELADA,
      },
    });

    expect(prismaMock.venta.delete).not.toHaveBeenCalled();

    expect(resultado).toEqual({
      id: 100,
      estado: Estado.CANCELADA,
    });
  });
});

describe('VentaService - findOne', () => {
  let service: VentaService;

  const ventaSimulada = {
    id: 100,
    clienteId: 10,
    usuarioId: 2,
    tipoVenta: TipoVenta.FIADO,
    total: new Prisma.Decimal('399.80'),
    estado: Estado.ACTIVA,
    fecha: new Date('2026-11-10T15:00:00.000Z'),

    cliente: {
      id: 10,
      nombre: 'Juan Pérez',
      telefono: '7751234567',
    },

    usuario: {
      id: 2,
      nombre: 'María Hernández',
      email: 'maria@example.com',
    },

    detalleVentas: [
      {
        id: 1,
        ventaId: 100,
        productoId: 5,
        cantidad: 2,
        precioUnitario: new Prisma.Decimal('199.90'),
        subtotal: new Prisma.Decimal('399.80'),
        producto: {
          id: 5,
          nombre: 'Perfume',
        },
      },
    ],
  };

  let ventaEncontrada: typeof ventaSimulada | null;

  const prismaMock = {
    venta: {
      findUnique: jest.fn(async (_args: unknown) => {
        return ventaEncontrada;
      }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    ventaEncontrada = ventaSimulada;

    service = new VentaService(prismaMock as unknown as PrismaService);
  });

  it('debe devolver una venta con sus relaciones', async () => {
    const resultado = await service.findOne(100);

    expect(resultado).toEqual(ventaSimulada);

    expect(prismaMock.venta.findUnique).toHaveBeenCalledWith({
      where: {
        id: 100,
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
  });

  it('debe rechazar una venta inexistente', async () => {
    ventaEncontrada = null;

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);

    expect(prismaMock.venta.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 999,
        },
      }),
    );
  });
});

describe('VentaService - findAll', () => {
  let service: VentaService;
  let totalRegistros = 1;

  const ventasSimuladas = [
    {
      id: 100,
      clienteId: 10,
      usuarioId: 2,
      tipoVenta: TipoVenta.FIADO,
      total: new Prisma.Decimal('399.80'),
      estado: Estado.ACTIVA,
      fecha: new Date('2026-11-10T15:00:00.000Z'),
      cliente: {
        id: 10,
        nombre: 'Juan Pérez',
      },
      usuario: {
        id: 2,
        nombre: 'María Hernández',
      },
      detalleVentas: [],
    },
  ];

  const prismaMock = {
    venta: {
      findMany: jest.fn(async (_args: unknown) => {
        return ventasSimuladas;
      }),

      count: jest.fn(async (_args: unknown) => {
        return totalRegistros;
      }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    totalRegistros = 1;

    service = new VentaService(prismaMock as unknown as PrismaService);
  });

  // PRUEBA 1
  it('debe listar ventas con paginación predeterminada', async () => {
    const resultado = await service.findAll({});

    expect(resultado).toEqual({
      data: ventasSimuladas,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    expect(prismaMock.venta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
      }),
    );

    expect(prismaMock.venta.count).toHaveBeenCalledTimes(1);
  });

  // PRUEBA 2
  it('debe calcular correctamente las páginas', async () => {
    totalRegistros = 15;

    const resultado = await service.findAll({
      page: 2,
      limit: 5,
    });

    expect(prismaMock.venta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      }),
    );

    expect(resultado.page).toBe(2);
    expect(resultado.limit).toBe(5);
    expect(resultado.total).toBe(15);
    expect(resultado.totalPages).toBe(3);
  });

  // PRUEBA 3
  it('debe aplicar filtros de ventas', async () => {
    await service.findAll({
      clienteId: 10,
      usuarioId: 2,
      tipoVenta: TipoVenta.FIADO,
      estado: Estado.CANCELADA,
    });

    const filtrosEsperados = {
      clienteId: 10,
      usuarioId: 2,
      tipoVenta: TipoVenta.FIADO,
      estado: Estado.CANCELADA,
    };

    expect(prismaMock.venta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining(filtrosEsperados),
      }),
    );

    expect(prismaMock.venta.count).toHaveBeenCalledWith({
      where: expect.objectContaining(filtrosEsperados),
    });
  });

  // PRUEBA 4
  it('debe filtrar fechas de México y rechazar rangos invertidos', async () => {
    await service.findAll({
      fechaDesde: '2026-11-01',
      fechaHasta: '2026-11-03',
    });

    expect(prismaMock.venta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fecha: {
            gte: new Date('2026-11-01T06:00:00.000Z'),
            lt: new Date('2026-11-04T06:00:00.000Z'),
          },
        }),
      }),
    );

    await expect(
      service.findAll({
        fechaDesde: '2026-11-04',
        fechaHasta: '2026-11-01',
      }),
    ).rejects.toThrow(BadRequestException);

    // La solicitud inválida no debe ejecutar consultas.
    expect(prismaMock.venta.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.venta.count).toHaveBeenCalledTimes(1);
  });
});
