import { createUploadthing, type FileRouter } from 'uploadthing/express';

const f = createUploadthing();

export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  mediaPost: f({
    image: { maxFileSize: '4MB', maxFileCount: 4 },
    video: { maxFileSize: '256MB', maxFileCount: 1 },
    audio: { maxFileSize: '32MB', maxFileCount: 1 },
  })
    .middleware(() => {
      return {} as { userId: string };
    })
    .onUploadComplete(({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log('Upload complete for userId:', metadata.userId);
      console.log('file url', file.ufsUrl);

      // !!! Everything returned here is sent to the clientside onUploadComplete callback
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
