export interface TimezoneEntry {
  value: string;
  label: string;
  flag: string;
  region: string;
}

export const SUPPORTED_TIMEZONES: TimezoneEntry[] = [
  // América
  { value: 'America/Santo_Domingo', label: 'Santo Domingo', flag: '🇩🇴', region: 'América' },
  { value: 'America/New_York', label: 'Nueva York', flag: '🇺🇸', region: 'América' },
  { value: 'America/Toronto', label: 'Toronto', flag: '🇨🇦', region: 'América' },
  { value: 'America/Chicago', label: 'Chicago', flag: '🇺🇸', region: 'América' },
  { value: 'America/Denver', label: 'Denver', flag: '🇺🇸', region: 'América' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles', flag: '🇺🇸', region: 'América' },
  { value: 'America/Mexico_City', label: 'Ciudad de México', flag: '🇲🇽', region: 'América' },
  { value: 'America/Bogota', label: 'Bogotá', flag: '🇨🇴', region: 'América' },
  { value: 'America/Lima', label: 'Lima', flag: '🇵🇪', region: 'América' },
  { value: 'America/Santiago', label: 'Santiago', flag: '🇨🇱', region: 'América' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires', flag: '🇦🇷', region: 'América' },
  { value: 'America/Sao_Paulo', label: 'São Paulo', flag: '🇧🇷', region: 'América' },
  { value: 'America/Panama', label: 'Panamá', flag: '🇵🇦', region: 'América' },
  { value: 'America/Caracas', label: 'Caracas', flag: '🇻🇪', region: 'América' },
  { value: 'America/Havana', label: 'La Habana', flag: '🇨🇺', region: 'América' },
  { value: 'America/Puerto_Rico', label: 'Puerto Rico', flag: '🇵🇷', region: 'América' },
  { value: 'America/Costa_Rica', label: 'Costa Rica', flag: '🇨🇷', region: 'América' },
  // Europa
  { value: 'Europe/Madrid', label: 'Madrid', flag: '🇪🇸', region: 'Europa' },
  { value: 'Europe/Paris', label: 'París', flag: '🇫🇷', region: 'Europa' },
  { value: 'Europe/Berlin', label: 'Berlín', flag: '🇩🇪', region: 'Europa' },
  { value: 'Europe/Rome', label: 'Roma', flag: '🇮🇹', region: 'Europa' },
  { value: 'Europe/London', label: 'Londres', flag: '🇬🇧', region: 'Europa' },
  { value: 'Europe/Warsaw', label: 'Varsovia', flag: '🇵🇱', region: 'Europa' },
  { value: 'Europe/Amsterdam', label: 'Ámsterdam', flag: '🇳🇱', region: 'Europa' },
  { value: 'Europe/Lisbon', label: 'Lisboa', flag: '🇵🇹', region: 'Europa' },
  { value: 'Europe/Stockholm', label: 'Estocolmo', flag: '🇸🇪', region: 'Europa' },
  { value: 'Europe/Oslo', label: 'Oslo', flag: '🇳🇴', region: 'Europa' },
  { value: 'Europe/Copenhagen', label: 'Copenhague', flag: '🇩🇰', region: 'Europa' },
  { value: 'Europe/Brussels', label: 'Bruselas', flag: '🇧🇪', region: 'Europa' },
  { value: 'Europe/Vienna', label: 'Viena', flag: '🇦🇹', region: 'Europa' },
  { value: 'Europe/Bucharest', label: 'Bucarest', flag: '🇷🇴', region: 'Europa' },
  { value: 'Europe/Athens', label: 'Atenas', flag: '🇬🇷', region: 'Europa' },
  { value: 'Europe/Helsinki', label: 'Helsinki', flag: '🇫🇮', region: 'Europa' },
  { value: 'Europe/Prague', label: 'Praga', flag: '🇨🇿', region: 'Europa' },
  { value: 'Europe/Dublin', label: 'Dublín', flag: '🇮🇪', region: 'Europa' },
  { value: 'Europe/Moscow', label: 'Moscú', flag: '🇷🇺', region: 'Europa' },
  { value: 'Europe/Istanbul', label: 'Estambul', flag: '🇹🇷', region: 'Europa' },
  // Asia
  { value: 'Asia/Tokyo', label: 'Tokio', flag: '🇯🇵', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seúl', flag: '🇰🇷', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapur', flag: '🇸🇬', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghái', flag: '🇨🇳', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', flag: '🇭🇰', region: 'Asia' },
  { value: 'Asia/Dubai', label: 'Dubái', flag: '🇦🇪', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok', flag: '🇹🇭', region: 'Asia' },
  { value: 'Asia/Taipei', label: 'Taipéi', flag: '🇹🇼', region: 'Asia' },
  { value: 'Asia/Manila', label: 'Manila', flag: '🇵🇭', region: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Yakarta', flag: '🇮🇩', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'Kolkata', flag: '🇮🇳', region: 'Asia' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur', flag: '🇲🇾', region: 'Asia' },
  // Global
  { value: 'UTC', label: 'UTC', flag: '🌐', region: 'Global' },
] as const;

export const REGIONS = ['América', 'Europa', 'Asia', 'Global'] as const;

const DEFAULT_TZ = 'America/Santo_Domingo';

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return DEFAULT_TZ;
  }
}

function getUtcOffsetMinutes(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  } as Intl.DateTimeFormatOptions);
  const parts = formatter.formatToParts(date);
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  if (tzName === 'GMT' || !tzName) return 0;
  const match = tzName.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  const h = parseInt(match[2], 10);
  const m = parseInt(match[3], 10);
  return sign * (h * 60 + m);
}

export function getUtcOffsetLabel(date: Date, timezone: string): string {
  const offsetMin = getUtcOffsetMinutes(date, timezone);
  if (offsetMin === 0) return 'UTC';
  const sign = offsetMin > 0 ? '+' : '';
  const h = Math.floor(Math.abs(offsetMin) / 60);
  const m = Math.abs(offsetMin) % 60;
  return `UTC${sign}${h}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''}`;
}

export function getTimezoneInfo(tz: string, date: Date): { flag: string; label: string; utcLabel: string } {
  const found = SUPPORTED_TIMEZONES.find((t) => t.value === tz);
  return {
    flag: found?.flag ?? '🌐',
    label: found?.label ?? tz,
    utcLabel: getUtcOffsetLabel(date, tz),
  };
}

export function buildUtcTimestamp(dateStr: string, timeStr: string, timezone: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  const local = new Date(Date.UTC(y, m - 1, d, h, min));
  const offsetMin = getUtcOffsetMinutes(local, timezone);
  return new Date(local.getTime() - offsetMin * 60_000).toISOString();
}

export function formatScheduleSummary(dateStr: string, timeStr: string, timezone: string): string {
  const date = new Date(`${dateStr}T${timeStr}:00`);
  const dateFormatted = date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = date.toLocaleTimeString('es-ES', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const tzInfo = getTimezoneInfo(timezone, date);
  return `Las predicciones cerrarán el ${dateFormatted} a las ${timeFormatted} (${tzInfo.label} ${tzInfo.utcLabel}).`;
}

export function getCountdownText(targetDate: Date): string {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) return '';
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `⏳ Faltan ${days} día${days !== 1 ? 's' : ''} y ${hours} hora${hours !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `⏳ Faltan ${hours} hora${hours !== 1 ? 's' : ''} y ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }
  return `⏳ Faltan ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
}

export function splitDatetimeForTimezone(datetimeStr: string | null, timezone: string | null): {
  date: string;
  time: string;
  tz: string;
} {
  if (!datetimeStr) {
    return { date: '', time: '', tz: timezone ?? detectTimezone() };
  }
  const d = new Date(datetimeStr);
  const tz = timezone ?? detectTimezone();
  const localStr = d.toLocaleString('sv-SE', { timeZone: tz });
  return {
    date: localStr.slice(0, 10),
    time: localStr.slice(11, 16),
    tz,
  };
}
