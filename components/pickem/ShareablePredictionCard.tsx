'use client';

import { forwardRef } from 'react';
import ReactCountryFlag from 'react-country-flag';

export const CARD_W = 1080;
export const CARD_H = 1350;
export const RECEIPT_EVENT_LOGO_WIDTH = 180;
export const RECEIPT_EVENT_LOGO_HEIGHT = 115;

interface RankedPlayer {
  position: number;
  label: string;
  countryCode: string | null;
}

interface ShareablePredictionCardProps {
  eventTitle: string;
  eventLogoUrl?: string | null;
  subtitle?: string;
  participantName: string;
  rankedPlayers: RankedPlayer[];
}

export const ShareablePredictionCard = forwardRef<HTMLDivElement, ShareablePredictionCardProps>(
  function ShareablePredictionCard(
    { eventTitle, eventLogoUrl, subtitle, participantName, rankedPlayers },
    ref,
  ) {
    const count = rankedPlayers.length;

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          background:
            'radial-gradient(ellipse at 50% 20%, rgba(120,60,200,0.04) 0%, transparent 60%), #0a0a0a',
          borderRadius: 36,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          border: '2px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* ===== HEADER ===== */}
        <div style={{ padding: '52px 56px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 180px', gap: 32 }}>
            <div>
              <div style={{ color: '#777', fontSize: 16, fontWeight: 600, letterSpacing: '0.18em', marginBottom: 10, textTransform: 'uppercase' }}>
                Pick&rsquo;em
              </div>
              <h1 style={{
                fontSize: 68,
                fontWeight: 800,
                color: '#EDEDF1',
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
              }}>
                {eventTitle}
              </h1>
              {subtitle && (
                <p style={{
                  fontSize: 24,
                  fontWeight: 500,
                  color: '#666',
                  margin: '4px 0 0',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {subtitle}
                </p>
              )}
            </div>
            {eventLogoUrl && (
              <div style={{
                width: RECEIPT_EVENT_LOGO_WIDTH,
                height: RECEIPT_EVENT_LOGO_HEIGHT,
                marginTop: 8,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
              }}>
                <img
                  src={eventLogoUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ===== DIVIDER ===== */}
        <div style={{
          margin: '28px 56px 20px',
          height: 1,
          background: 'rgba(255,255,255,0.06)',
        }} />

        {/* ===== PARTICIPANT ===== */}
        <div style={{ padding: '0 56px' }}>
          <div style={{ color: '#777', fontSize: 17, fontWeight: 500, letterSpacing: '0.06em', marginBottom: 2, textTransform: 'uppercase' }}>
            Predicción de
          </div>
          <div style={{
            fontSize: 44,
            fontWeight: 700,
            color: '#EDEDF1',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {participantName}
          </div>
        </div>

        {/* ===== DIVIDER ===== */}
        <div style={{
          margin: '20px 56px 0',
          height: 1,
          background: 'rgba(255,255,255,0.06)',
        }} />

        {/* ===== PLAYER LIST (light area) ===== */}
        <div style={{
          flex: 1,
          background: '#f5f5f0',
          margin: '20px 28px 0',
          borderRadius: 24,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: count > 0 ? 'space-evenly' : 'center',
          padding: '28px 28px',
        }}>
          {count === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', fontSize: 20, fontWeight: 500 }}>
              Sin selecciones
            </div>
          ) : (
            rankedPlayers.map((slot, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                  minHeight: 88,
                  borderBottom: i < count - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {/* Position box */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  backgroundColor: '#111',
                  color: '#fff',
                  fontSize: 24,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {slot.position}
                </div>

                {/* Player name */}
                <span style={{
                  flex: 1,
                  fontSize: 38,
                  fontWeight: 600,
                  color: '#1a1a1a',
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {slot.label}
                </span>

                {/* Country flag */}
                {slot.countryCode ? (
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', marginLeft: 8 }}>
                    <ReactCountryFlag
                      countryCode={slot.countryCode}
                      svg
                      style={{ width: '64px', height: '48px', borderRadius: 6, display: 'block' }}
                    />
                  </span>
                ) : (
                  <span style={{ width: 64, height: 48, flexShrink: 0, marginLeft: 8 }} />
                )}
              </div>
            ))
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div style={{
          padding: '24px 56px 36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 64,
            height: 1,
            background: 'rgba(255,255,255,0.08)',
          }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#555',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            <span>Powered by</span>
            <svg width="28" height="28" viewBox="0 0 1024 1024" fill="none">
              <rect x="80" y="80" width="864" height="864" rx="220" fill="#A855F7" />
              <path d="M365 335C365 315.67 380.67 300 400 300H585C615.376 300 640 324.624 640 355V506L501.5 644.5C487.433 658.567 468.356 666.469 448.462 666.469H400C380.67 666.469 365 650.799 365 631.469L492.5 503.969L365 335Z" fill="white" />
            </svg>
            <span style={{ color: '#888', fontWeight: 700 }}>PickHub</span>
          </div>
        </div>
      </div>
    );
  },
);
