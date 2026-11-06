import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class UpdateUsuarioDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => {
    const rawValue: unknown = value;
    return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  })
  @IsString()
  @IsNotEmpty()
  nombre?: string;

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
