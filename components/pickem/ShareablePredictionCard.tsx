'use client';

import { forwardRef } from 'react';
import ReactCountryFlag from 'react-country-flag';

export const CARD_W = 1080;
export const CARD_H = 1920;

interface RankedPlayer {
  position: number;
  label: string;
  countryCode: string | null;
}

interface ShareablePredictionCardProps {
  eventTitle: string;
  eventLogoUrl: string | null;
  creatorLabel: string;
  participantName: string;
  submittedAt: string | null;
  rankedPlayers: RankedPlayer[];
}

export const ShareablePredictionCard = forwardRef<HTMLDivElement, ShareablePredictionCardProps>(
  function ShareablePredictionCard(
    { eventTitle, eventLogoUrl, creatorLabel, participantName, submittedAt, rankedPlayers },
    ref,
  ) {
    const slots = Array.from({ length: 8 }, (_, i) => {
      const existing = rankedPlayers.find((r) => r.position === i + 1);
      return existing ?? { position: i + 1, label: '', countryCode: null };
    });

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          backgroundColor: '#050505',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {/* Purple glow accents */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 56px',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {eventLogoUrl ? (
              <img
                src={eventLogoUrl}
                alt=""
                style={{ maxWidth: 200, maxHeight: 64, objectFit: 'contain', alignSelf: 'flex-start' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="10" fill="#A000FF" />
                  <path d="M14 12L24 20L14 28" stroke="#EDEDF1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#808080', letterSpacing: '-0.02em' }}>
                  PickHub
                </span>
              </div>
            )}
          </div>

          <h1 style={{
            fontSize: 42,
            fontWeight: 800,
            color: '#EDEDF1',
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: 16,
          }}>
            {eventTitle}
          </h1>

          <p style={{
            fontSize: 20,
            color: '#A0A0A0',
            margin: 0,
            marginBottom: 8,
            fontWeight: 500,
          }}>
            Predicción de <strong style={{ color: '#EDEDF1' }}>{participantName}</strong>
          </p>

          <p style={{
            fontSize: 18,
            color: '#808080',
            margin: 0,
            fontWeight: 400,
          }}>
            Organizado por {creatorLabel}
          </p>

          {submittedAt && (
            <p style={{
              fontSize: 15,
              color: '#525252',
              margin: 0,
              marginTop: 4,
            }}>
              {new Date(submittedAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          {/* Divider */}
          <div style={{
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.06)',
            marginTop: 32,
            marginBottom: 40,
          }} />

          {/* Section title */}
          <p style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#A0A0A0',
            margin: 0,
            marginBottom: 24,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Top 8
          </p>

          {/* Top 8 list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slots.map((slot, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '10px 16px',
                  borderRadius: 8,
                  backgroundColor: slot.label ? 'rgba(255,255,255,0.04)' : 'transparent',
                  border: slot.label ? '1px solid rgba(255,255,255,0.06)' : '1px dashed rgba(255,255,255,0.08)',
                }}
              >
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: slot.label ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)',
                  color: slot.label ? '#C084FC' : '#525252',
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>

                <span style={{
                  flex: 1,
                  fontSize: 26,
                  fontWeight: 600,
                  color: slot.label ? '#EDEDF1' : '#525252',
                  lineHeight: 1.2,
                }}>
                  {slot.label || '—'}
                </span>

                {slot.countryCode && (
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <ReactCountryFlag
                      countryCode={slot.countryCode}
                      svg
                      style={{ width: '1.4em', height: '1.4em' }}
                    />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Powered by footer */}
        <div style={{
          textAlign: 'center',
          padding: '24px 56px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <p style={{
            fontSize: 14,
            color: '#525252',
            margin: 0,
            fontWeight: 500,
          }}>
            Powered by <span style={{ color: '#808080', fontWeight: 600 }}>PickHub</span>
          </p>
        </div>
      </div>
    );
  },
);
