/**
 * Provider-agnostic storage abstraction.
 * Swap UploadThing for S3, GCS, or Cloudflare R2 by implementing this interface
 * and updating the DI token in MediaModule.
 */
export interface StorageProvider {
  /**
   * Deletes a file by its storage key.
   * The key format is provider-specific — store it in MediaAsset.storageKey.
   */
  deleteFile(fileKey: string): Promise<void>;

  /** Returns the public CDN URL for a given file key. */
  getPublicUrl(fileKey: string): string;
}

export const STORAGE_PROVIDER = Symbol('StorageProvider');
