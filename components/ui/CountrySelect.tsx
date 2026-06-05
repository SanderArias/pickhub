'use client';

const COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
] as const;

export function CountrySelect({
  name = 'country_code',
  value,
  onChange,
  className,
}: {
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
}) {
  const isControlled = onChange !== undefined;

  return (
    <select
      name={name}
      {...(isControlled
        ? { value: value ?? '', onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value) }
        : { defaultValue: value ?? '' }
      )}
      className={`rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary ${className ?? ''}`}
    >
      <option value="">Sin país</option>
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.name}
        </option>
      ))}
    </select>
  );
}

export function getCountryFlag(code: string | null | undefined): string {
  if (!code) return '';
  const country = COUNTRIES.find((c) => c.code === code);
  return country?.flag ?? '';
}
