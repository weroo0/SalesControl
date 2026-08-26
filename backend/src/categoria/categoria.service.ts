import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoriaDto } from './dto/create-categoria.dto.js';
import { UpdateCategoriaDto } from './dto/update-categoria.dto.js';

@Injectable()
export class CategoriaService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizarNombre(nombre: string): string {
    const limpio = nombre.trim().toLocaleLowerCase('es-MX');

    return limpio.charAt(0).toLocaleUpperCase('es-MX') + limpio.slice(1);
  }

  async create(createCategoriaDto: CreateCategoriaDto) {
    const nombreNormalizado = this.normalizarNombre(createCategoriaDto.nombre);

    const categoriaExistente = await this.prisma.categoria.findFirst({
      where: {
        nombre: {
          equals: nombreNormalizado,
          mode: 'insensitive',
        },
      },
    });

    if (categoriaExistente) {
      throw new ConflictException('La categoria ya existe');
    }

    return this.prisma.categoria.create({
      data: {
        nombre: nombreNormalizado,
      },
    });
  }

  async findAll() {
    return this.prisma.categoria.findMany({
      where: {
        activo: true,
      },
    });
  }

  async findOne(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
    });

    if (!categoria) {
      throw new NotFoundException('Categoria no encontrada');
    }

    return categoria;
  }

  async updateOne(id: number, updateCategoriaDto: UpdateCategoriaDto) {
    await this.findOne(id);

    if (updateCategoriaDto.nombre !== undefined) {
      const nombreNormalizado = this.normalizarNombre(
        updateCategoriaDto.nombre,
      );
      const categoriaExistente = await this.prisma.categoria.findFirst({
        where: {
          nombre: {
            equals: nombreNormalizado,
            mode: 'insensitive',
          },
          NOT: {
            id: id,
          },
        },
      });

      if (categoriaExistente) {
        throw new ConflictException('La categoria ya existe');
      }
      return this.prisma.categoria.update({
        where: { id },
        data: {
          nombre: nombreNormalizado,
        },
      });
    } else {
      throw new BadRequestException('No se enviaron campos para actualizar');
    }
  }

  async desactivateOne(id: number) {
    await this.findOne(id);
    return this.prisma.categoria.update({
      where: { id },
      data: {
        activo: false,
      },
    });
  }

  async activateOne(id: number) {
    await this.findOne(id);
    return this.prisma.categoria.update({
      where: { id },
      data: {
        activo: true,
      },
    });
  }
}
