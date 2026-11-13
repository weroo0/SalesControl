import { randomUUID } from 'node:crypto';

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from '@jest/globals';

import { PrismaPg } from '@prisma/adapter-pg';

import {
  Estado,
  PrismaClient,
  Role,
  TipoVenta,
  TipoPago,
  Prisma,
} from '../../generated/prisma/client.js';

import { VentaService } from '../../src/venta/venta.service.js';
import { PagoService } from '../../src/pago/pago.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('Integración - venta FIADO y saldo', () => {
  let prisma: PrismaClient;
  let ventaService: VentaService;
  let pagoService: PagoService;

  // Guardaremos únicamente los IDs creados por esta prueba.
  let ids: {
    clienteId?: number;
    categoriaId?: number;
    productoId?: number;
    usuarioId?: number;
    ventaId?: number;
  } = {};

  beforeAll(async () => {
    const connectionString = process.env.TEST_DATABASE_URL;

    if (!connectionString) {
      throw new Error('Falta TEST_DATABASE_URL');
    }

    const url = new URL(connectionString);

    // Protección contra conexiones accidentales a desarrollo.
    if (
      url.hostname !== '127.0.0.1' ||
      url.port !== '5433' ||
      url.pathname !== '/salescontrol_test' ||
      url.username !== 'salescontrol_test'
    ) {
      throw new Error('La URL no corresponde a la base de pruebas');
    }

    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });

    await prisma.$connect();

    const databases = await prisma.$queryRaw<
      { database: string }[]
    >`SELECT current_database() AS database`;

    if (databases[0]?.database !== 'salescontrol_test') {
      throw new Error('Base de datos incorrecta');
    }

    ventaService = new VentaService(prisma as unknown as PrismaService);

    pagoService = new PagoService(prisma as unknown as PrismaService);
  });

  afterEach(async () => {
    // Limpieza en orden de dependencias.
    if (!prisma) return;

    if (ids.clienteId !== undefined) {
      await prisma.pago.deleteMany({
        where: {
          clienteId: ids.clienteId,
        },
      });
    }

    if (ids.ventaId !== undefined) {
      await prisma.detalleVenta.deleteMany({
        where: { ventaId: ids.ventaId },
      });

      await prisma.venta.deleteMany({
        where: { id: ids.ventaId },
      });
    }

    if (ids.productoId !== undefined) {
      await prisma.producto.deleteMany({
        where: { id: ids.productoId },
      });
    }

    if (ids.categoriaId !== undefined) {
      await prisma.categoria.deleteMany({
        where: { id: ids.categoriaId },
      });
    }

    if (ids.usuarioId !== undefined) {
      await prisma.usuario.deleteMany({
        where: { id: ids.usuarioId },
      });
    }

    if (ids.clienteId !== undefined) {
      await prisma.cliente.deleteMany({
        where: { id: ids.clienteId },
      });
    }

    ids = {};
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  async function crearVentaParaCancelacion(tipoVenta: TipoVenta) {
    const identificador = randomUUID();

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoría cancelación ${identificador}`,
      },
    });
    ids.categoriaId = categoria.id;

    const producto = await prisma.producto.create({
      data: {
        nombre: 'Producto de prueba de cancelación',
        precio: '250.00',
        categoriaId: categoria.id,
      },
    });
    ids.productoId = producto.id;

    const cliente = await prisma.cliente.create({
      data: {
        nombre: 'Cliente de prueba de cancelación',
      },
    });
    ids.clienteId = cliente.id;

    const vendedor = await prisma.usuario.create({
      data: {
        nombre: 'Vendedor de integración',
        email: `vendedor-${identificador}@example.test`,
        passwordHash: 'valor-ficticio-solo-para-pruebas',
        rol: Role.VENDEDOR,
      },
    });
    ids.usuarioId = vendedor.id;

    const venta = await ventaService.create(
      {
        clienteId: cliente.id,
        tipoVenta,
        detalles: [
          {
            productoId: producto.id,
            cantidad: 4,
          },
        ],
      },
      vendedor.id,
    );

    ids.ventaId = venta.id;

    return { cliente, venta };
  }

  it('debe aumentar el saldo al registrar una venta FIADO', async () => {
    // ARRANGE: preparar registros reales.

    const identificador = randomUUID();

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoría integración ${identificador}`,
      },
    });
    ids.categoriaId = categoria.id;

    const producto = await prisma.producto.create({
      data: {
        nombre: 'Perfume de integración',
        precio: '250.00',
        categoriaId: categoria.id,
      },
    });
    ids.productoId = producto.id;

    const cliente = await prisma.cliente.create({
      data: {
        nombre: 'Cliente prueba FIADO',
      },
    });
    ids.clienteId = cliente.id;

    const vendedor = await prisma.usuario.create({
      data: {
        nombre: 'Vendedor de integración',
        email: `vendedor-${identificador}@example.test`,
        passwordHash: 'valor-ficticio-solo-para-pruebas',
        rol: Role.VENDEDOR,
      },
    });
    ids.usuarioId = vendedor.id;

    // Comprobar que el saldo inicial es cero.
    const saldoInicial = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoInicial.equals(0)).toBe(true);

    // ACT: registrar una venta FIADO real.
    const venta = await ventaService.create(
      {
        clienteId: cliente.id,
        tipoVenta: TipoVenta.FIADO,
        detalles: [
          {
            productoId: producto.id,
            cantidad: 4,
          },
        ],
      },
      vendedor.id,
    );

    ids.ventaId = venta.id;

    // ASSERT: verificar los importes calculados.
    expect(venta.total.equals('1000.00')).toBe(true);

    expect(venta.tipoVenta).toBe(TipoVenta.FIADO);
    expect(venta.estado).toBe(Estado.ACTIVA);

    expect(venta.detalleVentas).toHaveLength(1);

    const detalle = venta.detalleVentas[0];

    expect(detalle?.cantidad).toBe(4);
    expect(detalle?.precioUnitario.equals('250.00')).toBe(true);
    expect(detalle?.subtotal.equals('1000.00')).toBe(true);

    // Verificar que PostgreSQL guardó la venta.
    const ventaGuardada = await prisma.venta.findUnique({
      where: { id: venta.id },
      include: {
        detalleVentas: true,
      },
    });

    expect(ventaGuardada).not.toBeNull();
    expect(ventaGuardada?.total.equals('1000.00')).toBe(true);
    expect(ventaGuardada?.detalleVentas).toHaveLength(1);

    // Comprobar la deuda resultante con el service real.
    const saldoFinal = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoFinal.equals('1000.00')).toBe(true);
  });

  it('debe reducir el saldo con un abono y restaurarlo al cancelar', async () => {
    // ARRANGE: crear los registros necesarios.
    const identificador = randomUUID();

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoría pago ${identificador}`,
      },
    });
    ids.categoriaId = categoria.id;

    const producto = await prisma.producto.create({
      data: {
        nombre: 'Producto para prueba de abono',
        precio: '250.00',
        categoriaId: categoria.id,
      },
    });
    ids.productoId = producto.id;

    const cliente = await prisma.cliente.create({
      data: {
        nombre: 'Cliente prueba abono parcial',
      },
    });
    ids.clienteId = cliente.id;

    const vendedor = await prisma.usuario.create({
      data: {
        nombre: 'Vendedor de integración',
        email: `vendedor-${identificador}@example.test`,
        passwordHash: 'valor-ficticio-solo-para-pruebas',
        rol: Role.VENDEDOR,
      },
    });
    ids.usuarioId = vendedor.id;

    // 1. Registrar una venta FIADO de $1,000.
    const venta = await ventaService.create(
      {
        clienteId: cliente.id,
        tipoVenta: TipoVenta.FIADO,
        detalles: [
          {
            productoId: producto.id,
            cantidad: 4,
          },
        ],
      },
      vendedor.id,
    );

    ids.ventaId = venta.id;

    const saldoInicial = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoInicial.equals('1000.00')).toBe(true);

    // 2. Registrar un abono parcial de $300.
    const pago = await pagoService.create(
      {
        clienteId: cliente.id,
        monto: 300,
        metodoPago: TipoPago.EFECTIVO,
        notas: 'Abono de integración',
      },
      vendedor.id,
    );

    expect(pago).toBeDefined();

    if (!pago) {
      throw new Error('No se registró el pago');
    }

    expect(pago.monto.equals('300.00')).toBe(true);
    expect(pago.estado).toBe(Estado.ACTIVA);

    // 3. El saldo debe disminuir a $700.
    const saldoDespuesDelPago = await pagoService.calcularSaldoCliente(
      cliente.id,
    );

    expect(saldoDespuesDelPago.equals('700.00')).toBe(true);

    // 4. Cancelar el pago.
    const pagoCancelado = await pagoService.cancelar(pago.id);

    expect(pagoCancelado.estado).toBe(Estado.CANCELADA);

    // 5. El pago debe permanecer en PostgreSQL.
    const pagoGuardado = await prisma.pago.findUnique({
      where: { id: pago.id },
    });

    expect(pagoGuardado).not.toBeNull();
    expect(pagoGuardado?.estado).toBe(Estado.CANCELADA);
    expect(pagoGuardado?.monto.equals('300.00')).toBe(true);

    // 6. El saldo debe regresar a $1,000.
    const saldoFinal = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoFinal.equals('1000.00')).toBe(true);
  });

  it('debe cancelar una venta FIADO sin pagos y reducir el saldo a cero', async () => {
    // ARRANGE: registrar una venta de $1,000.
    const { cliente, venta } = await crearVentaParaCancelacion(TipoVenta.FIADO);

    const saldoInicial = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoInicial.equals('1000.00')).toBe(true);

    // ACT: cancelar la venta.
    const ventaCancelada = await ventaService.cancelar(venta.id);

    // ASSERT: verificar la respuesta.
    expect(ventaCancelada.estado).toBe(Estado.CANCELADA);

    // Comprobar la persistencia en PostgreSQL.
    const ventaGuardada = await prisma.venta.findUnique({
      where: { id: venta.id },
      include: {
        detalleVentas: true,
      },
    });

    expect(ventaGuardada).not.toBeNull();
    expect(ventaGuardada?.estado).toBe(Estado.CANCELADA);
    expect(ventaGuardada?.detalleVentas).toHaveLength(1);

    // La venta cancelada ya no genera adeudo.
    const saldoFinal = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoFinal.equals(0)).toBe(true);

    // Una segunda cancelación debe ser rechazada.
    await expect(ventaService.cancelar(venta.id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('debe cancelar una venta CONTADO sin modificar la deuda', async () => {
    // ARRANGE: registrar una venta CONTADO.
    const { cliente, venta } = await crearVentaParaCancelacion(
      TipoVenta.CONTADO,
    );

    expect(venta.total.equals('1000.00')).toBe(true);

    const saldoInicial = await pagoService.calcularSaldoCliente(cliente.id);

    // Las ventas CONTADO no generan adeudos.
    expect(saldoInicial.equals(0)).toBe(true);

    // ACT: cancelar la venta.
    const ventaCancelada = await ventaService.cancelar(venta.id);

    expect(ventaCancelada.estado).toBe(Estado.CANCELADA);

    // ASSERT: la deuda continúa en cero.
    const saldoFinal = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoFinal.equals(0)).toBe(true);

    // El registro debe permanecer en PostgreSQL.
    const ventaGuardada = await prisma.venta.findUnique({
      where: { id: venta.id },
    });

    expect(ventaGuardada).not.toBeNull();
    expect(ventaGuardada?.estado).toBe(Estado.CANCELADA);
    expect(ventaGuardada?.total.equals('1000.00')).toBe(true);
  });

  it('debe impedir dos pagos simultáneos que superen la deuda', async () => {
    // ARRANGE: crear una venta FIADO de $1,000.
    const { cliente, venta } = await crearVentaParaCancelacion(TipoVenta.FIADO);

    const saldoInicial = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoInicial.equals('1000.00')).toBe(true);

    // ACT: intentar registrar dos pagos de $700
    // sin esperar individualmente la respuesta de cada uno.
    const resultados = await Promise.allSettled([
      pagoService.create(
        {
          clienteId: cliente.id,
          monto: 700,
          metodoPago: TipoPago.EFECTIVO,
          notas: 'Pago simultáneo A',
        },
        venta.usuarioId,
      ),

      pagoService.create(
        {
          clienteId: cliente.id,
          monto: 700,
          metodoPago: TipoPago.EFECTIVO,
          notas: 'Pago simultáneo B',
        },
        venta.usuarioId,
      ),
    ]);

    // ASSERT: exactamente uno debe registrarse.
    const exitosos = resultados.filter(
      (resultado) => resultado.status === 'fulfilled',
    );

    const rechazados = resultados.filter(
      (resultado) => resultado.status === 'rejected',
    );

    expect(exitosos).toHaveLength(1);
    expect(rechazados).toHaveLength(1);

    // El rechazo debe corresponder a una regla financiera
    // o al agotamiento de reintentos por concurrencia.
    const rechazado = rechazados[0];

    if (rechazado?.status !== 'rejected') {
      throw new Error('Se esperaba un pago rechazado');
    }

    expect(
      rechazado.reason instanceof BadRequestException ||
        rechazado.reason instanceof ConflictException,
    ).toBe(true);

    // Comprobar los pagos reales guardados en PostgreSQL.
    const pagosActivos = await prisma.pago.findMany({
      where: {
        clienteId: cliente.id,
        estado: Estado.ACTIVA,
      },
    });

    expect(pagosActivos).toHaveLength(1);

    expect(pagosActivos[0]?.monto.equals('700.00')).toBe(true);

    // El saldo final debe ser $300.
    const saldoFinal = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoFinal.equals('300.00')).toBe(true);
  });

  it('debe aceptar dos pagos simultáneos que cubren exactamente la deuda', async () => {
    // ARRANGE: crear una venta FIADO de $1,000.
    const { cliente, venta } = await crearVentaParaCancelacion(TipoVenta.FIADO);

    const saldoInicial = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoInicial.equals('1000.00')).toBe(true);

    // ACT: registrar dos pagos de $500 simultáneamente.
    const resultados = await Promise.allSettled([
      pagoService.create(
        {
          clienteId: cliente.id,
          monto: 500,
          metodoPago: TipoPago.EFECTIVO,
          notas: 'Pago simultáneo A',
        },
        venta.usuarioId,
      ),

      pagoService.create(
        {
          clienteId: cliente.id,
          monto: 500,
          metodoPago: TipoPago.EFECTIVO,
          notas: 'Pago simultáneo B',
        },
        venta.usuarioId,
      ),
    ]);

    // ASSERT: ambas operaciones deben terminar correctamente.
    const exitosos = resultados.filter(
      (resultado) => resultado.status === 'fulfilled',
    );

    const rechazados = resultados.filter(
      (resultado) => resultado.status === 'rejected',
    );

    expect(exitosos).toHaveLength(2);
    expect(rechazados).toHaveLength(0);

    // Comprobar los registros reales en PostgreSQL.
    const pagosActivos = await prisma.pago.findMany({
      where: {
        clienteId: cliente.id,
        estado: Estado.ACTIVA,
      },
    });

    expect(pagosActivos).toHaveLength(2);

    // Cada pago debe ser de $500.
    for (const pago of pagosActivos) {
      expect(pago.monto.equals('500.00')).toBe(true);
    }

    // Los pagos registrados deben sumar exactamente $1,000.
    const totalPagado = pagosActivos.reduce(
      (acumulado, pago) => acumulado.add(pago.monto),
      new Prisma.Decimal(0),
    );

    expect(totalPagado.equals('1000.00')).toBe(true);

    // El saldo pendiente debe quedar en cero.
    const saldoFinal = await pagoService.calcularSaldoCliente(cliente.id);

    expect(saldoFinal.equals(0)).toBe(true);
  });
});
