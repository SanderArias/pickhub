'use client';

import { useState } from 'react';

interface UserAvatarProps {
  name: string | null;
  url: string | null;
  size?: number;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function UserAvatar({ name, url, size = 28 }: UserAvatarProps) {
  const sizeClass = size === 32 ? 'size-8' : 'size-7';
  const [imgError, setImgError] = useState(false);

  const showFallback = !url || imgError;

  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden ${sizeClass}`}>
      {showFallback ? (
        <span className="flex size-full items-center justify-center bg-purple-primary/15 text-xs font-semibold text-purple-primary">
          {getInitials(name)}
        </span>
      ) : (
        <img
          src={url}
          alt={name ?? 'Participante'}
          onError={() => setImgError(true)}
          className="size-full object-cover"
        />
      )}
    </span>
  );
}
