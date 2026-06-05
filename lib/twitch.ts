export function normalizeTwitchChannel(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let channel = trimmed;

  if (channel.startsWith('https://')) channel = channel.slice(8);
  if (channel.startsWith('http://')) channel = channel.slice(7);

  if (channel.startsWith('twitch.tv/')) channel = channel.slice(10);
  if (channel.startsWith('www.twitch.tv/')) channel = channel.slice(14);
  if (channel.startsWith('m.twitch.tv/')) channel = channel.slice(12);

  const clean = channel.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return clean || null;
}
