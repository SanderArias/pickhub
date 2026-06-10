'use client';

import { useState } from 'react';

export function DescriptionField() {
  const [value, setValue] = useState('');
  const normalized = value.trim();
  const len = normalized.length;
  const hasContent = len > 0;
  const tooShort = hasContent && len < 10;
  const tooLong = len > 300;

  let error = '';
  if (tooLong) error = 'La descripción no puede superar los 300 caracteres.';
  else if (tooShort) error = 'La descripción debe tener al menos 10 caracteres.';

  return (
    <div>
      <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-text-secondary">
        Descripción <span className="text-text-muted">(opcional)</span>
      </label>
      <textarea
        id="description"
        name="description"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe de qué trata este Pick'em…"
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-colors ${
          error ? 'border-danger' : 'border-border bg-bg'
        }`}
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-danger">{error}</span>
        <span className={`text-xs ${len > 300 ? 'text-danger' : 'text-text-muted'}`}>
          {len}/300
        </span>
      </div>
    </div>
  );
}
