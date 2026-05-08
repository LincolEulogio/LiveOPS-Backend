import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from '../utils/tenant-context';

import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    tenantId?: string;
  };
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    const tenantId = user?.tenantId;
    if (tenantId) {
      return new Observable((observer) => {
        TenantContext.run(tenantId, () => {
          next.handle().subscribe(observer);
        });
      });
    }

    return next.handle();
  }
}
