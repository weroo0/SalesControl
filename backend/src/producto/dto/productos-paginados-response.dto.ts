import { ApiProperty } from '@nestjs/swagger';
import { ProductoResponseDto } from './producto-response.dto.js';
import { CategoriaResponseDto } from '../../categoria/dto/categoria-response.dto.js';

export class ProductoConCategoriaResponseDto extends ProductoResponseDto {
  @ApiProperty({
    type: CategoriaResponseDto,
    description: 'Categoría a la que pertenece el producto',
  })
  categoria!: CategoriaResponseDto;
}

export class ProductosPaginadosResponseDto {
  @ApiProperty({
    type: [ProductoConCategoriaResponseDto],
    description: 'Productos de la página solicitada',
  })
  data!: ProductoConCategoriaResponseDto[];

  @ApiProperty({
    example: 25,
    description: 'Total de productos que coinciden con los filtros',
  })
  total!: number;

  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Página actual',
  })
  page!: number;

  @ApiProperty({
    example: 10,
    minimum: 1,
    maximum: 50,
    description: 'Cantidad máxima de productos por página',
  })
  limit!: number;

  @ApiProperty({
    example: 3,
    description: 'Número total de páginas',
  })
  totalPages!: number;
}
