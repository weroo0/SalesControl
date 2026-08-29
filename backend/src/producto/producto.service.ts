import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductoDto } from './dto/create-producto.dto.js';
import { UpdateProductoDto } from './dto/update-producto.dto.js';

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

  async findAll() {
    return this.prisma.producto.findMany({
      where: {
        activo: true,
      },
      include: {
        categoria: true,
      },
    });
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
