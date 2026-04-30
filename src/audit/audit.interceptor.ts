import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    return next.handle().pipe(
      tap({
        next: () => {
        const durationMs = Date.now() - startTime;
        const path: string = request?.originalUrl ?? request?.url ?? '';
        const entity = this.extractEntity(path);
        const user = request?.user as
          | { email?: string; role?: string; idEmpresa?: string }
          | undefined;
        const requestId = request?.requestId as string | undefined;

        const statusCode = Number(response?.statusCode ?? 0);

        void this.auditService.log({
          eventType: 'HTTP_ACCESS',
          requestId,
          actorEmail: user?.email,
          actorRole: user?.role,
          actorTenantId: user?.idEmpresa,
          targetTenantId: this.extractTargetTenantId(request),
          httpMethod: request?.method,
          route: path,
          entity,
          statusCode,
          durationMs,
          ip: request?.ip,
          userAgent: request?.headers?.['user-agent'],
          metadata: {
            params: request?.params,
            query: request?.query,
          },
        });
        },
      }),
    );
  }

  private extractEntity(path: string): string | undefined {
    if (!path) return undefined;
    const segments = path.split('/').filter(Boolean);
    return segments[0];
  }

  private extractTargetTenantId(
    request: Record<string, unknown> | undefined,
  ): string | undefined {
    if (!request) return undefined;

    const params = (request.params as Record<string, string>) ?? {};
    const query = (request.query as Record<string, string>) ?? {};

    return (
      params.idEmpresa ??
      params.tenantId ??
      query.idEmpresa ??
      query.tenantId ??
      undefined
    );
  }
}
