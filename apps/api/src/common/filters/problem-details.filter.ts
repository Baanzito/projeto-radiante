import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status = exception.getStatus();
    const source = exception.getResponse();
    const payload = typeof source === 'object' && source !== null ? source : {};
    const rawMessage =
      typeof source === 'string'
        ? source
        : (payload as { message?: unknown }).message;
    const errors = Array.isArray(rawMessage) ? rawMessage : undefined;
    const detail =
      typeof rawMessage === 'string'
        ? rawMessage
        : errors
          ? 'Um ou mais campos são inválidos.'
          : exception.message;

    response.status(status).json({
      type: 'about:blank',
      title: this.title(status),
      status,
      detail,
      instance: request.originalUrl,
      ...(errors ? { errors } : {}),
    });
  }

  private title(status: number): string {
    return (
      {
        [HttpStatus.BAD_REQUEST]: 'Requisição inválida',
        [HttpStatus.NOT_FOUND]: 'Recurso não encontrado',
        [HttpStatus.CONFLICT]: 'Conflito de estado',
        [HttpStatus.SERVICE_UNAVAILABLE]: 'Serviço indisponível',
      }[status] ?? 'Não foi possível concluir a solicitação'
    );
  }
}
