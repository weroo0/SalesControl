import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Correo electrónico del usuario',
  })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'ContraseñaDeEjemplo123!',
    description: 'Contraseña del usuario',
    writeOnly: true,
  })
  password!: string;
}
