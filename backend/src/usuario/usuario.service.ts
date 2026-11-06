import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import * as argon2 from 'argon2';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { Role } from '../../generated/prisma/enums.js';

@Injectable()
export class UsuarioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const email = createUsuarioDto.email.trim().toLowerCase();
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }
    const passwordHash = await argon2.hash(createUsuarioDto.password);

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
    if (
      updateUsuarioDto.nombre === undefined &&
      updateUsuarioDto.email === undefined
    ) {
      throw new BadRequestException(
        'Proporciona al menos un campo para actualizar',
      );
    }
    await this.findOne(id);

    const data: {
      nombre?: string;
      email?: string;
    } = {};

    if (updateUsuarioDto.nombre !== undefined) {
      data.nombre = updateUsuarioDto.nombre;
    }

    if (updateUsuarioDto.email !== undefined) {
      const email = updateUsuarioDto.email.trim().toLowerCase();

      const usuarioConEmail = await this.prisma.usuario.findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive',
          },
          NOT: {
            id,
          },
        },
      });

      if (usuarioConEmail) {
        throw new ConflictException('El correo ya está registrado');
      }

      data.email = email;
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

  async desactivateOne(id: number, administradorId: number) {
    const usuario = await this.findOne(id);

    if (!usuario.activo) {
      throw new ConflictException('El usuario ya está inactivo');
    }

    if (id === administradorId) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }

    if (usuario.rol === Role.ADMIN) {
      const administradoresActivos = await this.prisma.usuario.count({
        where: {
          rol: Role.ADMIN,
          activo: true,
        },
      });

      if (administradoresActivos <= 1) {
        throw new ConflictException(
          'No se puede desactivar al último administrador activo',
        );
      }
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        activo: false,
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

  async activateOne(id: number) {
    const usuario = await this.findOne(id);

    if (usuario.activo) {
      throw new ConflictException('El usuario ya se encuentra activo');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
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
