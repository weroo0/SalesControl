import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsuarioService } from '../../usuario/usuario.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { Request } from 'express';
import { Role } from 'generated/prisma/enums.js';
import { RequestWithUser } from '../types/auth.types.js';

interface JwtPayload {
  sub: number;
  email: string;
  rol: Role;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly usuarioService: UsuarioService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch (error) {
      console.log('error al verificar jwt:', error);
      throw new UnauthorizedException('Token inválido o expirado');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Token invalido');
    }

    const usuario = await this.usuarioService.findOne(payload.sub);

    if (!usuario.activo) {
      throw new ForbiddenException('Usuario desactivado');
    }

    request.user = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization;

    const [type, token] = authorization?.trim().split(/\s+/) ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}
