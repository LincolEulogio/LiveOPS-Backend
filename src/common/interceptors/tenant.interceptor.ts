import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from '../utils/tenant-context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.tenantId) {
      return new Observable((observer) => {
        TenantContext.run(user.tenantId, () => {
          next.handle().subscribe(observer);
        });
      });
    }

    return next.handle();
  }
}
