import ReactCountryFlag from 'react-country-flag';
import { getCountryByCode } from '@/lib/countries';

interface CountryDisplayProps {
  code: string | null;
  showName?: boolean;
  showCode?: boolean;
  className?: string;
}

export function CountryDisplay({ code, showName = true, showCode = false, className }: CountryDisplayProps) {
  if (!code) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-muted" title="País no disponible">
        <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="hidden sm:inline">&mdash;</span>
      </span>
    );
  }

  const country = getCountryByCode(code);
  const name = country?.name ?? code;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <ReactCountryFlag
        countryCode={code}
        svg
        style={{ width: '1.1em', height: '1.1em' }}
        title={name}
        aria-label={showName ? undefined : `Bandera de ${name}`}
        aria-hidden={showName ? true : undefined}
      />
      {showName && (
        <span className="text-xs text-text-secondary truncate max-w-[120px] lg:max-w-[160px]" title={name}>
          {name}
        </span>
      )}
      {!showName && showCode && (
        <span className="text-xs text-text-muted">{code}</span>
      )}
    </span>
  );
}
