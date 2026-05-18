import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'skipAudit';

/** Apply to a controller or route handler to suppress AuditLog writes. */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
