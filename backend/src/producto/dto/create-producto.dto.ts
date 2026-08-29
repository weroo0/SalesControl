import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsNumber()
  @IsPositive()
  precio!: number;

  @IsInt()
  @IsPositive()
  categoriaId!: number;
}
