import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { ClienteModule } from './cliente/cliente.module.js';
import { CategoriaModule } from './categoria/categoria.module.js';
import { ProductoModule } from './producto/producto.module.js';
import { UsuarioModule } from './usuario/usuario.module.js';
import { AuthModule } from './auth/auth.module.js';
import { VentaModule } from './venta/venta.module.js';
import { PagoModule } from './pago/pago.module.js';
import { z } from 'zod';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config: Record<string, unknown>) => {
        const schema = z.object({
          NODE_ENV: z
            .enum(['development', 'production', 'test'])
            .default('development'),

          PORT: z.coerce.number().int().min(1).max(65535).default(3001),

          DATABASE_URL: z.string().url(),

          JWT_SECRET: z.string().min(32),

          CORS_ORIGINS: z.string().default(''),
        });

        const resultado = schema.safeParse(config);

        if (!resultado.success) {
          throw new Error(
            `Variables de entorno inválidas:\n${z.prettifyError(resultado.error)}`,
          );
        }

        return {
          ...config,
          ...resultado.data,
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 5,
      },
    ]),
    PrismaModule,
    ClienteModule,
    CategoriaModule,
    ProductoModule,
    UsuarioModule,
    AuthModule,
    VentaModule,
    PagoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
