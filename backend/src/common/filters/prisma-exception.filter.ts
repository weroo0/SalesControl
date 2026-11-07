import { Catch, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter<Prisma.PrismaClientKnownRequestError> {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status: number;
    let message: string;
    let error: string;

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = 'Ya existe un registro con esos datos';
        error = 'Conflict';
        break;

      case 'P2003':
        status = HttpStatus.CONFLICT;
        message = 'La operación viola una relación existente';
        error = 'Conflict';
        break;

      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'El registro solicitado no existe';
        error = 'Not Found';
        break;

      case 'P2034':
        status = HttpStatus.CONFLICT;
        message = 'Conflicto entre operaciones simultaneas';
        error = 'Conflict';
        break;

      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Error interno del servidor';
        error = 'Internal Server Error';

        this.logger.error(
          `Error de Prisma no contemplado: ${exception.code}`,
          exception.stack,
        );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
    });
  }
}
