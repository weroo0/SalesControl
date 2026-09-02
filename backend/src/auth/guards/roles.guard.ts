import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from 'generated/prisma/enums.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

interface AuthenticatedUser {
  sub: number;
  email: string;
  rol: Role;
}

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'No se pudo determinar el usuario autenticado',
      );
    }

    const tienePermiso = requiredRoles.includes(user.rol);

    if (!tienePermiso) {
      throw new ForbiddenException('No tienes permisos para esta accion');
    }

    return true;
  }
}
