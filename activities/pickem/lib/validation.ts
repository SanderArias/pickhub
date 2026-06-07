export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
export const MAX_FILE_SIZE = 1_048_576; // 1 MB

export function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return map[mime] ?? 'png';
}
