import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { INestApplication, ValidationPipe } from '@nestjs/common';

import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as argon2 from 'argon2';

import { Role } from '../../generated/prisma/client.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

// Obtiene el JWT de la respuesta de login.
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

  throw new Error('No se encontró access_token ni accessToken en la respuesta');
}

describe('E2E - Auth y autorización', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let vendedorToken: string;

  const usuariosCreados: number[] = [];

  const password = 'TestPassword123!';

  beforeAll(async () => {
    const testUrl = process.env.TEST_DATABASE_URL;
    const databaseUrl = process.env.DATABASE_URL;

    if (
      process.env.NODE_ENV !== 'test' ||
      !testUrl ||
      databaseUrl !== testUrl
    ) {
      throw new Error(
        'Las pruebas e2e requieren NODE_ENV=test y DATABASE_URL=TEST_DATABASE_URL',
      );
    }

    const url = new URL(testUrl);

    if (
      url.hostname !== '127.0.0.1' ||
      url.port !== '5433' ||
      url.pathname !== '/salescontrol_test' ||
      url.username !== 'salescontrol_test'
    ) {
      throw new Error('La conexión no corresponde a salescontrol_test');
    }

    // Importamos AppModule después de comprobar el entorno.
    const { AppModule } = await import('../../src/app.module.js');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // Reproducimos la configuración global de main.ts.
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
      throw new Error('Base de datos incorrecta');
    }

    // Crear dos usuarios reales exclusivamente para pruebas.
    const identificador = randomUUID();
    const passwordHash = await argon2.hash(password);

    const administrador = await prisma.usuario.create({
      data: {
        nombre: 'Administrador E2E',
        email: `admin-${identificador}@example.test`,
        passwordHash,
        rol: Role.ADMIN,
        activo: true,
      },
    });

    usuariosCreados.push(administrador.id);

    const vendedor = await prisma.usuario.create({
      data: {
        nombre: 'Vendedor E2E',
        email: `vendedor-${identificador}@example.test`,
        passwordHash,
        rol: Role.VENDEDOR,
        activo: true,
      },
    });

    usuariosCreados.push(vendedor.id);

    // Autenticarnos mediante el endpoint real.
    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: administrador.email,
        password,
      });

    expect([200, 201]).toContain(loginAdmin.status);

    adminToken = extraerToken(loginAdmin.body as unknown);

    const loginVendedor = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: vendedor.email,
        password,
      });

    expect([200, 201]).toContain(loginVendedor.status);

    vendedorToken = extraerToken(loginVendedor.body as unknown);
  });

  afterAll(async () => {
    if (prisma && usuariosCreados.length > 0) {
      await prisma.usuario.deleteMany({
        where: {
          id: { in: usuariosCreados },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it('debe rechazar consultas sin JWT', async () => {
    await request(app.getHttpServer()).get('/usuarios').expect(401);
  });

  it('debe impedir que VENDEDOR consulte usuarios', async () => {
    await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(403);
  });

  it('debe permitir que ADMIN consulte usuarios', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body: unknown = respuesta.body;

    expect(Array.isArray(body)).toBe(true);

    // Ninguna respuesta debe exponer hashes.
    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });

  it('debe impedir que VENDEDOR cree usuarios', async () => {
    await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        nombre: 'Usuario prohibido',
        email: 'prohibido@example.test',
        password: 'Password123!',
      })
      .expect(403);
  });

  it('debe rechazar credenciales incorrectas', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'inexistente@example.test',
        password: 'PasswordIncorrecto123!',
      })
      .expect(401);
  });
});
