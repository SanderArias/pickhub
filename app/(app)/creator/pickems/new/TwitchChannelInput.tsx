'use client';

import { useState } from 'react';
import { normalizeTwitchChannel } from '@/lib/twitch';

export function TwitchChannelInput() {
  const [preview, setPreview] = useState('');

  return (
    <div>
      <label htmlFor="twitch_channel" className="mb-1.5 block text-sm font-medium text-text-secondary">
        Canal de Twitch <span className="text-text-muted">(opcional)</span>
      </label>
      <input
        id="twitch_channel"
        name="twitch_channel"
        type="text"
        placeholder="Ej. tftlatam"
        onChange={(e) => {
          const normalized = normalizeTwitchChannel(e.target.value);
          setPreview(normalized ?? '');
        }}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
      />
      {preview && (
        <p className="mt-1 text-xs text-text-muted">
          Se mostrará como: twitch.tv/{preview}
        </p>
      )}
    </div>
  );
}
