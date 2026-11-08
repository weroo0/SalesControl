import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClienteDto {
  @ApiProperty({
    example: 'Luis Enrique',
    description: 'Nombre del cliente',
  })
  @Transform(({ value }) => {
    const rawValue: unknown = value;
    return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiPropertyOptional({
    example: '7711234567',
    description: 'Teléfono del cliente',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    example: 'Colonia Centro',
    description: 'Dirección del cliente',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({
    example: 'Prefiere pagar los viernes',
    description: 'Observaciones adicionales',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  notas?: string;
}
