import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { UpdateClienteDto } from './dto/update-cliente.dto.js';

@Injectable()
export class ClienteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClienteDto) {
    return this.prisma.cliente.create({
      data: {
        nombre: createClientDto.nombre,
        telefono: createClientDto.telefono,
        direccion: createClientDto.direccion,
        notas: createClientDto.notas,
      },
    });
  }

  async findAll() {
    return this.prisma.cliente.findMany({
      where: {
        activo: true,
      },
    });
  }

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return cliente;
  }

  async updateOne(id: number, updateClienteDto: UpdateClienteDto) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: updateClienteDto,
    });
  }

  async desactivateOne(id: number) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: {
        activo: false,
      },
    });
  }

  async activateOne(id: number) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: {
        activo: true,
      },
    });
  }
}
