// Video caps for the demo. Videos live in Postgres (the free database has
// 1 GB), so they're kept short and small. Shared by the server checks and the
// upload forms, so the form can warn before uploading.

export const STORY_VIDEO = { maxBytes: 4 * 1024 * 1024, maxSeconds: 15 } as const;
export const REEL_VIDEO = { maxBytes: 10 * 1024 * 1024, maxSeconds: 60 } as const;

export const megabytes = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;
