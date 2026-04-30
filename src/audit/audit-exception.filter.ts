import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditService } from './audit.service';

@Catch()
export class AuditExceptionFilter implements ExceptionFilter {
  constructor(private readonly auditService: AuditService) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { requestId?: string; user?: any }>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const path = request.originalUrl ?? request.url;
    const user = request.user as
      | { email?: string; role?: string; idEmpresa?: string }
      | undefined;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>)?.message ??
          (exception as Error)?.message ??
          'Erro interno';

    const eventType =
      statusCode === HttpStatus.UNAUTHORIZED
        ? 'AUTHN_DENIED'
        : statusCode === HttpStatus.FORBIDDEN
        ? 'AUTHZ_DENIED'
        : 'HTTP_ERROR';

    await this.auditService.log({
      eventType,
      requestId: request.requestId,
      actorEmail: user?.email,
      actorRole: user?.role,
      actorTenantId: user?.idEmpresa,
      targetTenantId:
        (request.params?.idEmpresa as string | undefined) ??
        (request.query?.idEmpresa as string | undefined),
      httpMethod: request.method,
      route: path,
      entity: path.split('/').filter(Boolean)[0],
      statusCode,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      errorName: (exception as Error)?.name ?? 'Error',
      errorMessage: Array.isArray(message) ? message.join(', ') : String(message),
      metadata: {
        params: request.params,
        query: request.query,
      },
    });

    if (response.headersSent) {
      return;
    }

    response.status(statusCode).json({
      statusCode,
      message:
        statusCode === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Erro interno do servidor'
          : message,
    });
  }
}
