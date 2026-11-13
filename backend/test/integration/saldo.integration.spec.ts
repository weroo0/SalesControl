import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from '@jest/globals';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client.js';

import { PagoService } from '../../src/pago/pago.service.js';

import type { PrismaService } from '../../src/prisma/prisma.service.js';

describe('Integración - saldo del cliente', () => {
  let prisma: PrismaClient;
  let pagoService: PagoService;
  let clienteId: number | null = null;

  beforeAll(async () => {
    // No permitimos usar la base de desarrollo.
    const connectionString = process.env.TEST_DATABASE_URL;

    if (!connectionString) {
      throw new Error('Falta TEST_DATABASE_URL');
    }

    const url = new URL(connectionString);

    if (
      url.hostname !== '127.0.0.1' ||
      url.port !== '5433' ||
      url.pathname !== '/salescontrol_test' ||
      url.username !== 'salescontrol_test'
    ) {
      throw new Error('Las pruebas deben utilizar la base salescontrol_test');
    }

    const adapter = new PrismaPg({
      connectionString,
    });

    prisma = new PrismaClient({
      adapter,
    });

    await prisma.$connect();

    pagoService = new PagoService(prisma as unknown as PrismaService);
  });

  afterEach(async () => {
    // Eliminamos únicamente el cliente creado por la prueba.
    if (clienteId !== null) {
      await prisma.cliente.delete({
        where: { id: clienteId },
      });

      clienteId = null;
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('debe conectarse a la base de pruebas', async () => {
    const resultado = await prisma.$queryRaw<
      { database: string }[]
    >`SELECT current_database() AS database`;

    expect(resultado[0]?.database).toBe('salescontrol_test');
  });

  it('debe calcular saldo cero para un cliente nuevo', async () => {
    // Arrange: crear un cliente real en PostgreSQL.
    const cliente = await prisma.cliente.create({
      data: {
        nombre: 'Cliente de prueba de integración',
      },
    });

    clienteId = cliente.id;

    // Act: ejecutar nuestro service real.
    const saldo = await pagoService.calcularSaldoCliente(cliente.id);

    // Assert: comprobar el saldo esperado.
    expect(saldo.equals(0)).toBe(true);

    // Comprobar que el cliente realmente existe.
    const clienteGuardado = await prisma.cliente.findUnique({
      where: { id: cliente.id },
    });

    expect(clienteGuardado).not.toBeNull();
    expect(clienteGuardado?.nombre).toBe('Cliente de prueba de integración');
  });
});
