import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '@/common/services/audit.service';

interface AuditRequest {
  method: string;
  url: string;
  ip: string;
  user?: { id: string };
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
}

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditInterceptor');

  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const method = request.method;
    const url = request.url;
    const user = request.user; // Assumes AuthGuard is used

    // Only log mutations (POST, PUT, PATCH, DELETE)
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!isMutation) return next.handle();

    // Skip non-critical or repetitive paths if needed
    if (
      url.includes('/telemetry') ||
      url.includes('/health') ||
      url.includes('/guests/activate')
    )
      return next.handle();

    const startTime = Date.now();
    const body = request.body as Record<string, unknown> | undefined;
    const productionId: string | undefined =
      request.params.id ||
      (typeof body?.productionId === 'string'
        ? body.productionId
        : undefined) ||
      request.query.productionId;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(`${method} ${url} - ${duration}ms`);

          // Log to DB via AuditService
          void this.auditService.log({
            productionId,
            userId: user?.id,
            action: `API_${method}`,
            details: {
              url,
              method,
              body: request.body,
              durationMs: duration,
              userAgent: request.headers['user-agent'],
              status: 'success',
            },
            ipAddress: request.ip,
          });
        },
        error: (err: unknown) => {
          const duration = Date.now() - startTime;
          const errMessage = err instanceof Error ? err.message : String(err);
          void this.auditService.log({
            productionId,
            userId: user?.id,
            action: `API_${method}_ERROR`,
            details: {
              url,
              method,
              body: request.body,
              durationMs: duration,
              userAgent: request.headers['user-agent'],
              error: errMessage,
              status: 'failed',
            },
            ipAddress: request.ip,
          });
        },
      }),
    );
  }
}
