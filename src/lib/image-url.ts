// Public URLs for files kept in Postgres. Importable from client components,
// which can't load the server-only image and video code.
export const imageUrl = (id: string) => `/api/images/${id}`;
export const mediaUrl = (id: string) => `/api/media/${id}`;
