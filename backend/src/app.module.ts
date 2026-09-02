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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ClienteModule,
    CategoriaModule,
    ProductoModule,
    UsuarioModule,
    AuthModule,
    VentaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
