import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoriaDto {
  @Transform(({ value }) => {
    const rawValue: unknown = value;

    return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;
}
