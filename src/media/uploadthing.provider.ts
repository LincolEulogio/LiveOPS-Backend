import { Injectable, Logger } from '@nestjs/common';
import type { StorageProvider } from './storage.provider';

const UPLOADTHING_CDN = 'https://utfs.io/f';

@Injectable()
export class UploadThingProvider implements StorageProvider {
  private readonly logger = new Logger(UploadThingProvider.name);

  deleteFile(fileKey: string): Promise<void> {
    // UploadThing file deletion requires their server-side SDK call.
    // Implement via their REST API when a delete API key is configured.
    this.logger.warn(
      `UploadThing deleteFile called for key "${fileKey}". ` +
        'Configure UPLOADTHING_SECRET to enable server-side deletion.',
    );
    return Promise.resolve();
  }

  getPublicUrl(fileKey: string): string {
    return `${UPLOADTHING_CDN}/${fileKey}`;
  }
}
