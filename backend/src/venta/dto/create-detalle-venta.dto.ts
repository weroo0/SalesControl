import { IsInt, IsPositive } from 'class-validator';

export class CreateDetalleVentaDto {
  @IsInt()
  @IsPositive()
  productoId!: number;

  @IsInt()
  @IsPositive()
  cantidad!: number;
}
