import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './create-login.dto.js';
import { Public } from './decorators/public.decorator.js';
import { UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión xdxd',
    description: 'Verifica las credenciales y devuelve un JWT de acceso.',
  })
  @ApiResponse({
    status: 201,
    description: 'Inicio de sesión correcto.',
  })
  @ApiResponse({
    status: 401,
    description: 'Correo o contraseña incorrectos.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario desactivado.',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos de inicio de sesión.',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
