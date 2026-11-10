import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';

export class UsuarioResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Identificador del usuario',
  })
  id!: number;

  @ApiProperty({
    example: 'María Hernández',
    description: 'Nombre completo',
  })
  nombre!: string;

  @ApiProperty({
    example: 'maria@example.com',
    format: 'email',
    description: 'Correo electrónico',
  })
  email!: string;

  @ApiProperty({
    enum: Role,
    enumName: 'Role',
    example: Role.VENDEDOR,
    description: 'Rol del usuario dentro de SalesControl',
  })
  rol!: Role;

  @ApiProperty({
    example: true,
    description: 'Indica si el usuario está activo',
  })
  activo!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-09T16:30:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt!: string;
}
