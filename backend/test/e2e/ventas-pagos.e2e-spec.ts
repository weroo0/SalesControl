import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import request from 'supertest';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';

import { ValidationPipe, type INestApplication } from '@nestjs/common';

import { Test } from '@nestjs/testing';

import {
  Estado,
  Prisma,
  Role,
  TipoPago,
  TipoVenta,
} from '../../generated/prisma/client.js';

import { PrismaService } from '../../src/prisma/prisma.service.js';

describe('E2E - Ventas y Pagos', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let vendedorToken: string;

  let adminId: number | undefined;
  let vendedorId: number | undefined;
  let categoriaId: number | undefined;
  let productoId: number | undefined;
  let clienteId: number | undefined;

  const password = 'TestPassword123!';

  // Extraer el JWT de la respuesta de login.
  function extraerToken(body: unknown): string {
    if (typeof body !== 'object' || body === null) {
      throw new Error('Respuesta de login inválida');
    }

    if ('access_token' in body && typeof body.access_token === 'string') {
      return body.access_token;
    }

    if ('accessToken' in body && typeof body.accessToken === 'string') {
      return body.accessToken;
    }

    throw new Error('Token no encontrado');
  }

  // Iniciar sesión mediante HTTP real.
  async function iniciarSesion(email: string): Promise<string> {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });

    expect([200, 201]).toContain(respuesta.status);

    return extraerToken(respuesta.body as unknown);
  }

  // Obtener el saldo a través del endpoint HTTP.
  async function consultarSaldo(): Promise<Prisma.Decimal> {
    const respuesta = await request(app.getHttpServer())
      .get(`/clientes/${clienteId}/estado-cuenta`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = respuesta.body as { saldo: string };

    return new Prisma.Decimal(body.saldo);
  }

  // Registrar una venta real mediante HTTP.
  async function registrarVenta(
    tipoVenta: TipoVenta = TipoVenta.FIADO,
  ): Promise<number> {
    const respuesta = await request(app.getHttpServer())
      .post('/ventas')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId,
        tipoVenta,
        detalles: [
          {
            productoId,
            cantidad: 4,
          },
        ],
      })
      .expect(201);

    const body = respuesta.body as {
      id: number;
      total: string;
    };

    expect(new Prisma.Decimal(body.total).equals('1000')).toBe(true);

    return body.id;
  }

  beforeAll(async () => {
    // Seguridad: utilizar exclusivamente la base de pruebas.
    const testUrl = process.env.TEST_DATABASE_URL;
    const databaseUrl = process.env.DATABASE_URL;

    if (
      process.env.NODE_ENV !== 'test' ||
      !testUrl ||
      databaseUrl !== testUrl
    ) {
      throw new Error('Entorno e2e inválido');
    }

    const url = new URL(testUrl);

    if (
      url.hostname !== '127.0.0.1' ||
      url.port !== '5433' ||
      url.pathname !== '/salescontrol_test' ||
      url.username !== 'salescontrol_test'
    ) {
      throw new Error('Base de datos de pruebas incorrecta');
    }

    const { AppModule } = await import('../../src/app.module.js');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    const databases = await prisma.$queryRaw<
      { database: string }[]
    >`SELECT current_database() AS database`;

    if (databases[0]?.database !== 'salescontrol_test') {
      throw new Error('Conexión incorrecta');
    }

    const identificador = randomUUID();
    const passwordHash = await argon2.hash(password);

    // Crear administrador.
    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Administrador E2E',
        email: `admin-${identificador}@example.test`,
        passwordHash,
        rol: Role.ADMIN,
      },
    });

    adminId = admin.id;

    // Crear vendedor.
    const vendedor = await prisma.usuario.create({
      data: {
        nombre: 'Vendedor E2E',
        email: `vendedor-${identificador}@example.test`,
        passwordHash,
        rol: Role.VENDEDOR,
      },
    });

    vendedorId = vendedor.id;

    // Crear categoría.
    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoría E2E ${identificador}`,
      },
    });

    categoriaId = categoria.id;

    // Crear producto de $250.
    const producto = await prisma.producto.create({
      data: {
        nombre: 'Producto E2E',
        precio: '250.00',
        categoriaId,
      },
    });

    productoId = producto.id;

    // Obtener tokens válidos.
    adminToken = await iniciarSesion(admin.email);
    vendedorToken = await iniciarSesion(vendedor.email);
  });

  beforeEach(async () => {
    // Cada prueba utiliza un cliente independiente.
    const cliente = await prisma.cliente.create({
      data: {
        nombre: `Cliente E2E ${randomUUID()}`,
      },
    });

    clienteId = cliente.id;
  });

  afterEach(async () => {
    if (!prisma || clienteId === undefined) return;

    // Eliminar pagos creados para este cliente.
    await prisma.pago.deleteMany({
      where: { clienteId },
    });

    // Recuperar las ventas que pertenecen al cliente.
    const ventas = await prisma.venta.findMany({
      where: { clienteId },
      select: { id: true },
    });

    const ventaIds = ventas.map((venta) => venta.id);

    // Eliminar detalles antes de eliminar sus ventas.
    await prisma.detalleVenta.deleteMany({
      where: {
        ventaId: { in: ventaIds },
      },
    });

    await prisma.venta.deleteMany({
      where: { clienteId },
    });

    await prisma.cliente.delete({
      where: { id: clienteId },
    });

    clienteId = undefined;
  });

  afterAll(async () => {
    if (prisma) {
      if (productoId !== undefined) {
        await prisma.producto.delete({
          where: { id: productoId },
        });
      }

      if (categoriaId !== undefined) {
        await prisma.categoria.delete({
          where: { id: categoriaId },
        });
      }

      if (vendedorId !== undefined) {
        await prisma.usuario.delete({
          where: { id: vendedorId },
        });
      }

      if (adminId !== undefined) {
        await prisma.usuario.delete({
          where: { id: adminId },
        });
      }
    }

    if (app) await app.close();
  });

  // PRUEBA 1
  it('debe registrar venta FIADO, abono y consultar el saldo', async () => {
    const ventaId = await registrarVenta();

    expect(ventaId).toBeGreaterThan(0);

    // La venta genera $1,000 de adeudo.
    const saldoInicial = await consultarSaldo();
    expect(saldoInicial.equals('1000')).toBe(true);

    // Registrar un pago parcial de $300.
    const respuestaPago = await request(app.getHttpServer())
      .post('/pagos')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId,
        monto: 300,
        metodoPago: TipoPago.EFECTIVO,
        notas: 'Abono E2E',
      })
      .expect(201);

    const pago = respuestaPago.body as {
      id: number;
      monto: string;
    };

    expect(new Prisma.Decimal(pago.monto).equals('300')).toBe(true);

    // Comprobar el pago mediante su endpoint.
    await request(app.getHttpServer())
      .get(`/pagos/${pago.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // El saldo pendiente debe quedar en $700.
    const saldoFinal = await consultarSaldo();
    expect(saldoFinal.equals('700')).toBe(true);
  });

  // PRUEBA 2
  it('no debe generar deuda con ventas CONTADO', async () => {
    await registrarVenta(TipoVenta.CONTADO);

    const saldo = await consultarSaldo();
    expect(saldo.equals(0)).toBe(true);

    // Sin deuda pendiente, un abono debe rechazarse.
    await request(app.getHttpServer())
      .post('/pagos')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId,
        monto: 100,
        metodoPago: TipoPago.EFECTIVO,
      })
      .expect(409);
  });

  // PRUEBA 3
  it('debe rechazar solicitudes con datos inválidos', async () => {
    // El total no debe enviarse desde el frontend.
    await request(app.getHttpServer())
      .post('/ventas')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId,
        tipoVenta: TipoVenta.FIADO,
        detalles: [
          {
            productoId,
            cantidad: 1,
          },
        ],
        total: 999,
      })
      .expect(400);

    // Un monto negativo tampoco debe permitirse.
    await request(app.getHttpServer())
      .post('/pagos')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId,
        monto: -100,
        metodoPago: TipoPago.EFECTIVO,
      })
      .expect(400);

    // Ninguna venta ni pago debe haberse guardado.
    const ventas = await prisma.venta.count({
      where: { clienteId },
    });

    const pagos = await prisma.pago.count({
      where: { clienteId },
    });

    expect(ventas).toBe(0);
    expect(pagos).toBe(0);
  });

  // PRUEBA 4
  it('debe restringir cancelaciones al ADMIN', async () => {
    const ventaId = await registrarVenta();

    const respuestaPago = await request(app.getHttpServer())
      .post('/pagos')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId,
        monto: 300,
        metodoPago: TipoPago.EFECTIVO,
      })
      .expect(201);

    const pago = respuestaPago.body as { id: number };

    // El vendedor no puede cancelar ventas.
    await request(app.getHttpServer())
      .patch(`/ventas/${ventaId}/cancelar`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(403);

    // Tampoco puede cancelar pagos.
    await request(app.getHttpServer())
      .patch(`/pagos/${pago.id}/cancelar`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(403);

    // El administrador cancela primero el pago.
    const cancelacionPago = await request(app.getHttpServer())
      .patch(`/pagos/${pago.id}/cancelar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((cancelacionPago.body as { estado: Estado }).estado).toBe(
      Estado.CANCELADA,
    );

    // Después cancela la venta registrada por error.
    const cancelacionVenta = await request(app.getHttpServer())
      .patch(`/ventas/${ventaId}/cancelar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((cancelacionVenta.body as { estado: Estado }).estado).toBe(
      Estado.CANCELADA,
    );

    // No debe quedar deuda pendiente.
    const saldoFinal = await consultarSaldo();
    expect(saldoFinal.equals(0)).toBe(true);
  });
});
