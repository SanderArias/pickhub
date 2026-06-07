'use client';

import { useState, useEffect } from 'react';
import { normalizeOAuthError } from '@/lib/normalize-auth-error';

function getError(): { code: string; description: string } | null {
  if (typeof window === 'undefined') return null;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hashErr = hashParams.get('error');
  if (hashErr) {
    return { code: hashErr, description: hashParams.get('error_description') ?? '' };
  }

  const qs = new URLSearchParams(window.location.search);
  const queryErr = qs.get('error');
  if (queryErr) {
    return { code: queryErr, description: qs.get('error_description') ?? '' };
  }

  return null;
}

function clearErrorParams() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  let changed = false;

  if (url.hash.startsWith('#error=') || url.hash.startsWith('#error_description=')) {
    url.hash = '';
    changed = true;
  }

  if (url.searchParams.has('error') || url.searchParams.has('error_description')) {
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    changed = true;
  }

  if (changed) {
    window.history.replaceState(null, '', url.toString());
  }
}

export function OAuthErrorBanner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const error = getError();
  if (!error) return null;

  const normalized = normalizeOAuthError(error.code, error.description);

  useEffect(() => {
    clearErrorParams();
  }, []);

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
      <p className="mt-0.5 text-xs text-danger/80">{normalized.message}</p>
    </div>
  );
}
