import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  Estado,
  Prisma,
  TipoVenta,
  TipoPago,
} from '../../generated/prisma/client.js';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PagoService } from './pago.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePagoDto } from './dto/create-pago.dto.js';

describe('PagoService - calcularSaldoCliente', () => {
  let service: PagoService;

  // Resultados simulados de PostgreSQL
  let totalVentas: Prisma.Decimal | null = null;
  let totalPagos: Prisma.Decimal | null = null;

  const prismaMock = {
    venta: {
      aggregate: jest.fn(async () => ({
        _sum: { total: totalVentas },
      })),
    },
    pago: {
      aggregate: jest.fn(async () => ({
        _sum: { monto: totalPagos },
      })),
    },
  };

  beforeEach(() => {
    totalVentas = null;
    totalPagos = null;

    jest.clearAllMocks();

    service = new PagoService(prismaMock as unknown as PrismaService);
  });

  it('debe calcular el saldo pendiente correctamente', async () => {
    totalVentas = new Prisma.Decimal('1000.00');
    totalPagos = new Prisma.Decimal('300.00');

    const saldo = await service.calcularSaldoCliente(10);

    expect(saldo.equals(new Prisma.Decimal('700.00'))).toBe(true);
  });

  it('debe devolver cero cuando no existen ventas ni pagos', async () => {
    const saldo = await service.calcularSaldoCliente(10);

    expect(saldo.equals(0)).toBe(true);
  });

  it('debe conservar la precisión decimal', async () => {
    totalVentas = new Prisma.Decimal('999.99');
    totalPagos = new Prisma.Decimal('199.91');

    const saldo = await service.calcularSaldoCliente(10);

    expect(saldo.equals(new Prisma.Decimal('800.08'))).toBe(true);
  });

  it('debe consultar solamente ventas FIADO activas y pagos activos', async () => {
    totalVentas = new Prisma.Decimal('1000');
    totalPagos = new Prisma.Decimal('250');

    await service.calcularSaldoCliente(10);

    expect(prismaMock.venta.aggregate).toHaveBeenCalledWith({
      _sum: {
        total: true,
      },
      where: {
        clienteId: 10,
        tipoVenta: TipoVenta.FIADO,
        estado: Estado.ACTIVA,
      },
    });

    expect(prismaMock.pago.aggregate).toHaveBeenCalledWith({
      _sum: {
        monto: true,
      },
      where: {
        clienteId: 10,
        estado: Estado.ACTIVA,
      },
    });
  });
});

describe('PagoService - create', () => {
  let service: PagoService;

  // Valores que controlaremos desde cada prueba
  let clienteExiste = true;
  let totalVentas = new Prisma.Decimal('1000');
  let totalPagos = new Prisma.Decimal('300');

  // Simulación de las operaciones dentro de la transacción
  const txMock = {
    cliente: {
      findUnique: jest.fn(async (_args: unknown) => {
        return clienteExiste ? { id: 10 } : null;
      }),
    },

    venta: {
      aggregate: jest.fn(async (_args: unknown) => ({
        _sum: {
          total: totalVentas,
        },
      })),
    },

    pago: {
      aggregate: jest.fn(async (_args: unknown) => ({
        _sum: {
          monto: totalPagos,
        },
      })),

      create: jest.fn(async (_args: unknown) => ({
        id: 1,
      })),
    },
  };

  // Simulamos $transaction ejecutando su callback
  const prismaMock = {
    $transaction: jest.fn(
      async (
        callback: (tx: typeof txMock) => Promise<unknown>,
        _options?: unknown,
      ) => callback(txMock),
    ),
  };

  // Datos válidos que reutilizaremos en las pruebas
  const dto: CreatePagoDto = {
    clienteId: 10,
    monto: 200,
    metodoPago: TipoPago.EFECTIVO,
    notas: 'Abono semanal',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockReset();

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );

    clienteExiste = true;
    totalVentas = new Prisma.Decimal('1000');
    totalPagos = new Prisma.Decimal('300');

    service = new PagoService(prismaMock as unknown as PrismaService);
  });

  it('debe rechazar un pago si el cliente no existe', async () => {
    clienteExiste = false;

    await expect(service.create(dto, 2)).rejects.toThrow(NotFoundException);

    expect(txMock.pago.create).not.toHaveBeenCalled();
  });

  it('debe rechazar un pago si el cliente no tiene deuda', async () => {
    totalVentas = new Prisma.Decimal('300');
    totalPagos = new Prisma.Decimal('300');

    await expect(service.create(dto, 2)).rejects.toThrow(ConflictException);

    expect(txMock.pago.create).not.toHaveBeenCalled();
  });

  it('debe rechazar pagos superiores al saldo', async () => {
    // Deuda disponible: 1000 - 300 = 700
    const pagoExcesivo = {
      ...dto,
      monto: 800,
    };

    await expect(service.create(pagoExcesivo, 2)).rejects.toThrow(
      BadRequestException,
    );

    expect(txMock.pago.create).not.toHaveBeenCalled();
  });

  it('debe registrar correctamente un pago parcial', async () => {
    // Deuda disponible: 700; pago solicitado: 200
    const resultado = await service.create(dto, 2);

    expect(txMock.pago.create).toHaveBeenCalledTimes(1);

    expect(txMock.pago.create).toHaveBeenCalledWith({
      data: {
        clienteId: 10,
        usuarioId: 2,
        monto: new Prisma.Decimal('200'),
        metodoPago: TipoPago.EFECTIVO,
        notas: 'Abono semanal',
        estado: Estado.ACTIVA,
      },
    });

    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    expect(resultado).toEqual({ id: 1 });
  });

  it('debe reintentar cuando ocurre un error P2034', async () => {
    const error = Object.assign(new Error('Conflicto de serialización'), {
      code: 'P2034',
    });

    // La primera transacción falla.
    prismaMock.$transaction.mockRejectedValueOnce(error);

    // El segundo intento usa la implementación normal.
    const resultado = await service.create(dto, 2);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(txMock.pago.create).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ id: 1 });
  });

  it('debe reintentar cuando PostgreSQL devuelve 40001', async () => {
    const error = Object.assign(new Error('Error del driver PostgreSQL'), {
      cause: {
        originalCode: '40001',
      },
    });

    prismaMock.$transaction.mockRejectedValueOnce(error);

    const resultado = await service.create(dto, 2);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(txMock.pago.create).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ id: 1 });
  });

  it('debe rechazar el pago después de tres conflictos', async () => {
    const error = Object.assign(new Error('Conflicto de serialización'), {
      code: 'P2034',
    });

    // Simulamos tres transacciones fallidas consecutivas.
    prismaMock.$transaction
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error);

    await expect(service.create(dto, 2)).rejects.toThrow(ConflictException);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(3);

    expect(txMock.pago.create).not.toHaveBeenCalled();
  });

  it('no debe reintentar cuando el error no es de serialización', async () => {
    const error = new Error('Error inesperado');

    prismaMock.$transaction.mockRejectedValueOnce(error);

    await expect(service.create(dto, 2)).rejects.toThrow('Error inesperado');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    expect(txMock.pago.create).not.toHaveBeenCalled();
  });
});

describe('PagoService - cancelar', () => {
  let service: PagoService;

  // Representa el pago que encontrará Prisma
  let pagoExistente: {
    id: number;
    estado: Estado;
  } | null;

  // Simulación de Prisma
  const prismaMock = {
    pago: {
      findUnique: jest.fn(async (_args: unknown) => {
        return pagoExistente;
      }),

      update: jest.fn(async (_args: unknown) => {
        return {
          id: 25,
          estado: Estado.CANCELADA,
        };
      }),

      delete: jest.fn(async (_args: unknown) => {
        return { id: 25 };
      }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Cada prueba comienza con un pago activo
    pagoExistente = {
      id: 25,
      estado: Estado.ACTIVA,
    };

    service = new PagoService(prismaMock as unknown as PrismaService);
  });

  it('debe rechazar la cancelación de un pago inexistente', async () => {
    // Arrange
    pagoExistente = null;

    // Act y Assert
    await expect(service.cancelar(25)).rejects.toThrow(NotFoundException);

    expect(prismaMock.pago.update).not.toHaveBeenCalled();
  });

  it('debe rechazar un pago que ya está cancelado', async () => {
    // Arrange
    pagoExistente = {
      id: 25,
      estado: Estado.CANCELADA,
    };

    // Act y Assert
    await expect(service.cancelar(25)).rejects.toThrow(ConflictException);

    expect(prismaMock.pago.update).not.toHaveBeenCalled();
  });

  it('debe cancelar correctamente un pago activo', async () => {
    // Act
    const resultado = await service.cancelar(25);

    // Assert
    expect(prismaMock.pago.findUnique).toHaveBeenCalledWith({
      where: { id: 25 },
    });

    expect(prismaMock.pago.update).toHaveBeenCalledTimes(1);

    expect(prismaMock.pago.update).toHaveBeenCalledWith({
      where: { id: 25 },
      data: {
        estado: Estado.CANCELADA,
      },
    });

    expect(prismaMock.pago.delete).not.toHaveBeenCalled();

    expect(resultado).toEqual({
      id: 25,
      estado: Estado.CANCELADA,
    });
  });
});

describe('PagoService - findOne', () => {
  let service: PagoService;

  const pagoSimulado = {
    id: 25,
    clienteId: 10,
    usuarioId: 2,
    monto: new Prisma.Decimal('150.50'),
    estado: Estado.ACTIVA,
    cliente: {
      id: 10,
      nombre: 'María Hernández',
    },
    usuario: {
      id: 2,
      nombre: 'Administrador',
    },
  };

  let pagoEncontrado: typeof pagoSimulado | null;

  const prismaMock = {
    pago: {
      findUnique: jest.fn(async (_args: unknown) => {
        return pagoEncontrado;
      }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    pagoEncontrado = pagoSimulado;

    service = new PagoService(prismaMock as unknown as PrismaService);
  });

  it('debe devolver un pago existente con sus relaciones', async () => {
    const resultado = await service.findOne(25);

    expect(resultado).toEqual(pagoSimulado);

    expect(prismaMock.pago.findUnique).toHaveBeenCalledWith({
      where: { id: 25 },
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
  });

  it('debe rechazar un pago inexistente', async () => {
    pagoEncontrado = null;

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);

    expect(prismaMock.pago.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
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
  });
});

describe('PagoService - findAll', () => {
  let service: PagoService;
  let totalRegistros = 1;

  const pagosSimulados = [
    {
      id: 25,
      monto: new Prisma.Decimal('150.50'),
      cliente: {
        id: 10,
        nombre: 'María Hernández',
      },
      usuario: {
        id: 2,
        nombre: 'Administrador',
      },
    },
  ];

  const prismaMock = {
    pago: {
      findMany: jest.fn(async (_args: unknown) => {
        return pagosSimulados;
      }),

      count: jest.fn(async (_args: unknown) => {
        return totalRegistros;
      }),
    },

    $transaction: jest.fn(async (operaciones: Promise<unknown>[]) => {
      return Promise.all(operaciones);
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    totalRegistros = 1;

    service = new PagoService(prismaMock as unknown as PrismaService);
  });

  it('debe listar pagos con paginación predeterminada', async () => {
    const resultado = await service.findAll({});

    expect(resultado).toEqual({
      data: pagosSimulados,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    expect(prismaMock.pago.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 10,
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
    });

    expect(prismaMock.pago.count).toHaveBeenCalledWith({
      where: {},
    });
  });

  it('debe calcular correctamente la paginación', async () => {
    totalRegistros = 5;

    const resultado = await service.findAll({
      page: 2,
      limit: 2,
    });

    expect(prismaMock.pago.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 2,
        take: 2,
      }),
    );

    expect(resultado.page).toBe(2);
    expect(resultado.limit).toBe(2);
    expect(resultado.total).toBe(5);
    expect(resultado.totalPages).toBe(3);
  });

  it('debe aplicar los filtros de consulta', async () => {
    await service.findAll({
      clienteId: 10,
      usuarioId: 2,
      metodoPago: TipoPago.EFECTIVO,
      estado: Estado.CANCELADA,
    });

    const whereEsperado = {
      clienteId: 10,
      usuarioId: 2,
      metodoPago: TipoPago.EFECTIVO,
      estado: Estado.CANCELADA,
    };

    expect(prismaMock.pago.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: whereEsperado,
      }),
    );

    expect(prismaMock.pago.count).toHaveBeenCalledWith({
      where: whereEsperado,
    });
  });

  it('debe aplicar fechas de México y rechazar un rango invertido', async () => {
    await service.findAll({
      fechaDesde: '2026-11-01',
      fechaHasta: '2026-11-03',
    });

    expect(prismaMock.pago.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fechaPago: {
            gte: new Date('2026-11-01T06:00:00.000Z'),
            lt: new Date('2026-11-04T06:00:00.000Z'),
          },
        },
      }),
    );

    await expect(
      service.findAll({
        fechaDesde: '2026-11-04',
        fechaHasta: '2026-11-01',
      }),
    ).rejects.toThrow(BadRequestException);

    // Solamente la primera consulta llegó a la transacción.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
