import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import * as argon2 from 'argon2';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';

@Injectable()
export class UsuarioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const email = createUsuarioDto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(createUsuarioDto.password);

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    return this.prisma.usuario.create({
      data: {
        nombre: createUsuarioDto.nombre.trim(),
        email,
        passwordHash,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      where: {
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  async updateOne(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    await this.findOne(id);

    if (updateUsuarioDto.email !== undefined) {
      const email = updateUsuarioDto.email.trim().toLowerCase();

      const usuarioConEmail = await this.prisma.usuario.findFirst({
        where: {
          email,
          NOT: {
            id,
          },
        },
      });

      const data: {
        nombre?: string;
        email?: string;
      } = {};

      if (usuarioConEmail) {
        throw new ConflictException('El correo ya está registrado');
      }

      if (updateUsuarioDto.nombre !== undefined) {
        data.nombre = updateUsuarioDto.nombre.trim();
      }

      if (updateUsuarioDto.email !== undefined) {
        data.email = updateUsuarioDto.email.trim();
      }

      return this.prisma.usuario.update({
        where: { id },
        data,
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          activo: true,
          createdAt: true,
        },
      });
    }
  }

  async desactivateOne(id: number) {
    await this.findOne(id);
    return this.prisma.usuario.update({
      where: { id },
      data: {
        activo: false,
      },
    });
  }

  async activateOne(id: number) {
    await this.findOne(id);
    return this.prisma.usuario.update({
      where: { id },
      data: {
        activo: true,
      },
    });
  }

  async findByEmailForAuth(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
        email: true,
        passwordHash: true,
        rol: true,
        activo: true,
      },
    });
  }
}
