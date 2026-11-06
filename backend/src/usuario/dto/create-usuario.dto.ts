import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @Transform(({ value }) => {
    const rawValue: unknown = value;

    return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @Transform(({ value }) => {
    const rawValue: unknown = value;

    return typeof rawValue === 'string'
      ? rawValue.trim().toLowerCase()
      : rawValue;
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/\S/, {
    message:
      'La contraseña debe contener al menos un carácter distinto de espacio',
  })
  password!: string;
}
