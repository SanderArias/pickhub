'use client';

import { forwardRef } from 'react';

interface Player {
  id: string;
  name: string;
  is_active: boolean;
}

interface Creator {
  handle: string | null;
  display_name: string | null;
  avatar_url?: string | null;
}

interface ShareImageCardProps {
  title: string;
  description?: string | null;
  creator: Creator | null;
  players: Player[];
  slug: string;
  status: string;
}

const CARD_W = 1200;
const CARD_H = 630;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export const ShareImageCard = forwardRef<HTMLDivElement, ShareImageCardProps>(
  function ShareImageCard({ title, description, creator, players, slug, status }, ref) {
    const activePlayers = players.filter((p) => p.is_active);
    const displayPlayers = activePlayers.slice(0, 32);
    const extraCount = activePlayers.length - 32;

    const cols = chunkArray(
      displayPlayers.map((p) => p.name),
      Math.ceil(displayPlayers.length / Math.min(displayPlayers.length, 3)) || 1,
    );

    const creatorLabel = creator?.display_name ?? creator?.handle ?? '—';

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          backgroundColor: '#0A0A0A',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
            transform: 'translate(80px, -80px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)',
            transform: 'translate(-120px, 120px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 56px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="10" fill="#A000FF" />
                <path d="M14 12L24 20L14 28" stroke="#EDEDF1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#EDEDF1', letterSpacing: '-0.02em' }}>
                PickHub
              </span>
            </div>

            {status !== 'draft' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 20, padding: '6px 14px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#A855F7' }}>
                  Participa en PickHub
                </span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 16 }}>
            <h1 style={{
              fontSize: 42,
              fontWeight: 800,
              color: '#EDEDF1',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              margin: 0,
              maxWidth: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {title}
            </h1>
            <p style={{
              fontSize: 16,
              color: '#6B6B6B',
              marginTop: 8,
              margin: '8px 0 0 0',
            }}>
              {description ?? 'Haz tus predicciones'}
            </p>
            <p style={{
              fontSize: 14,
              color: '#8A8A8A',
              marginTop: 20,
              margin: '20px 0 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="4" stroke="#8A8A8A" strokeWidth="1.5" />
                <path d="M4 21C4 17.6863 7.68629 15 12 15C16.3137 15 20 17.6863 20 21" stroke="#8A8A8A" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Organizado por {creatorLabel}
            </p>
          </div>

          {activePlayers.length > 0 && (
            <div style={{ display: 'flex', gap: 40, marginTop: 8 }}>
              {cols.map((col, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {col.map((name) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                        <circle cx="3" cy="3" r="3" fill="#A855F7" />
                      </svg>
                      <span style={{ fontSize: 13, color: '#A0A0A0', whiteSpace: 'nowrap' }}>{name}</span>
                    </div>
                  ))}
                  {i === cols.length - 1 && extraCount > 0 && (
                    <span style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>
                      +{extraCount} jugador{extraCount !== 1 ? 'es' : ''} mas
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {activePlayers.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#6B6B6B" strokeWidth="1.5" />
                <path d="M12 8V12M12 16H12.01" stroke="#6B6B6B" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 13, color: '#6B6B6B' }}>
                Jugadores por confirmar
              </span>
            </div>
          )}
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: '#6B6B6B' }}>
            pickhub.com/pickems/{slug}
          </span>
          {status === 'draft' && (
            <span style={{
              fontSize: 11,
              color: '#8A8A8A',
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 12,
              padding: '3px 10px',
            }}>
              Borrador
            </span>
          )}
        </div>
      </div>
    );
  },
);
