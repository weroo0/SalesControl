import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({
    example: 'Luis Enrique',
    description: 'Nuevo nombre del usuario',
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => {
    const rawValue: unknown = value;
    return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  })
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @ApiPropertyOptional({
    example: 'luis@gmail.com',
    description: 'Nuevo correo del usuario',
    format: 'email',
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => {
    const rawValue: unknown = value;
    return typeof rawValue === 'string'
      ? rawValue.trim().toLowerCase()
      : rawValue;
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email?: string;
}
