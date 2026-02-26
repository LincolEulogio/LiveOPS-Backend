import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService, AuditAction } from '@/common/services/audit.service';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('AuditInterceptor');

    constructor(private auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        const url = request.url;
        const user = request.user; // Assumes AuthGuard is used

        // Only log mutations (POST, PUT, PATCH, DELETE)
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        if (!isMutation) return next.handle();

        // Skip non-critical or repetitive paths if needed
        if (url.includes('/telemetry') || url.includes('/health')) return next.handle();

        const startTime = Date.now();

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const duration = Date.now() - startTime;
                    this.logger.log(`${method} ${url} - ${duration}ms`);

                    // Log to DB via AuditService
                    this.auditService.log({
                        userId: user?.id,
                        action: `API_${method}`,
                        details: {
                            url,
                            method,
                            body: request.body,
                            durationMs: duration,
                            status: 'success'
                        },
                        ipAddress: request.ip
                    });
                },
                error: (err) => {
                    const duration = Date.now() - startTime;
                    this.auditService.log({
                        userId: user?.id,
                        action: `API_${method}_ERROR`,
                        details: {
                            url,
                            method,
                            body: request.body,
                            durationMs: duration,
                            error: err.message,
                            status: 'failed'
                        },
                        ipAddress: request.ip
                    });
                }
            }),
        );
    }
}
