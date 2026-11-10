import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoriaDto {
  @ApiProperty({
    example: 'Alimentos',
    description: 'Nombre de la categoria',
    minLength: 1,
  })
  @Transform(({ value }) => {
    const rawValue: unknown = value;

    return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;
}
