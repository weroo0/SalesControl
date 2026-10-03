import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductoDto } from './dto/create-producto.dto.js';
import { UpdateProductoDto } from './dto/update-producto.dto.js';
import { ProductoQueryDto } from './dto/producto-query.dto.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class ProductoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductoDto: CreateProductoDto) {
    const categoria = await this.findOneCategoria(
      createProductoDto.categoriaId,
    );
    if (!categoria.activo) {
      throw new ConflictException('La categoria está inactiva');
    }

    return this.prisma.producto.create({
      data: createProductoDto,
    });
  }

  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
      },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return producto;
  }

  async findOneCategoria(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
    });

    if (!categoria) {
      throw new NotFoundException('Categoria no encontrada');
    }

    return categoria;
  }

  async findCategoriasActive() {
    return this.prisma.categoria.findMany({
      where: {
        activo: true,
      },
    });
  }

  async findAll(query: ProductoQueryDto) {
    const where: Prisma.ProductoWhereInput = {
      activo: query.activo ?? true,
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    if (query.nombre) {
      where.nombre = {
        contains: query.nombre,
        mode: 'insensitive',
      };
    }

    if (query.categoriaId) {
      where.categoriaId = query.categoriaId;
    }

    const [productos, total] = await this.prisma.$transaction([
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          id: 'asc',
        },
        include: {
          categoria: true,
        },
      }),

      this.prisma.producto.count({
        where,
      }),
    ]);
    return {
      data: productos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateOne(id: number, updateProductoDto: UpdateProductoDto) {
    await this.findOne(id);

    if (updateProductoDto.categoriaId !== undefined) {
      const categoria = await this.findOneCategoria(
        updateProductoDto.categoriaId,
      );
      if (!categoria.activo) {
        throw new ConflictException('La categoria está inactiva, asigna otra');
      }
    }

    return this.prisma.producto.update({
      where: { id },
      data: updateProductoDto,
    });
  }

  async desactivateOne(id: number) {
    await this.findOne(id);
    return this.prisma.producto.update({
      where: { id },
      data: {
        activo: false,
      },
    });
  }

  async activateOne(id: number) {
    await this.findOne(id);
    return this.prisma.producto.update({
      where: { id },
      data: {
        activo: true,
      },
    });
  }
}
