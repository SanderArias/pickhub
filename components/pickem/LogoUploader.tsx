'use client';

import { useRef, useState, useCallback } from 'react';
import { uploadEventLogo, removeEventLogo } from '@/activities/pickem/actions';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

export function LogoUploader({
  eventId,
  currentUrl,
}: {
  eventId: string;
  currentUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  const validateFile = useCallback((file: File): string | null => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      return 'Formato no soportado. Usa PNG, JPG, WEBP o SVG.';
    }
    if (file.size > 1_048_576) {
      return 'El logo no puede superar 1 MB.';
    }
    return null;
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('logo', file);

    const result = await uploadEventLogo(eventId, null, formData);
    if (result.error) {
      setError(result.error);
    } else if (result.url) {
      setPreview(result.url);
    }

    setUploading(false);
  }, [eventId, validateFile]);

  const handleRemove = useCallback(async () => {
    setRemoving(true);
    setError(null);
    const result = await removeEventLogo(eventId);
    if (result.error) {
      setError(result.error);
    } else {
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    }
    setRemoving(false);
  }, [eventId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {preview ? (
          <div className="flex items-center gap-3">
            <img
              src={preview}
              alt="Logo del torneo"
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="rounded-lg border border-danger-border px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              {removing ? 'Quitando...' : 'Quitar logo'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-purple-primary px-3 py-1.5 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white">
              {uploading ? 'Subiendo...' : 'Subir logo'}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <span className="text-xs text-text-muted">
              PNG, JPG, WEBP o SVG. Máximo 1 MB.
            </span>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
