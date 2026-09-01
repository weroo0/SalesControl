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

interface JwtPayload {
  sub: number;
  email: string;
  rol: string;
}

type RequestWithUser = Request & {
  user?: JwtPayload;
};

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

    console.log(request.headers.authorization);

    const token = this.extractTokenFromHeader(request);
    console.log('token extraido:', token);
    console.log('partes del jwt:', token?.split('.').length);

    if (!token) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      console.log('payload:', payload);
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

    request.user = payload;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}
