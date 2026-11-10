import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @ApiProperty({
    example: 'Luis Enrique',
    description: 'Nombre completo del usuario',
    minLength: 1,
  })
  @Transform(({ value }) => {
    const rawValue: unknown = value;

    return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({
    example: 'luis@gmail.com',
    description: 'Correo electrónico único del usuario',
    format: 'email',
  })
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

  @ApiProperty({
    example: 'ClaveSegura123!',
    description: 'Contraseña de acceso del usuario',
    minLength: 8,
    format: 'password',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/\S/, {
    message:
      'La contraseña debe contener al menos un carácter distinto de espacio',
  })
  password!: string;
}
