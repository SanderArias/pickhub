'use client';

import { forwardRef } from 'react';
import ReactCountryFlag from 'react-country-flag';
import type { ReceiptTemplate } from '@/lib/receipt-templates';

export const CARD_W = 600;

const BORDER_RADIUS = 24;

const classicStyles = {
  outer: {
    background: '#09090b',
    border: '1px solid #27272a',
  },
  rankingPanel: {
    background: '#f4f4f0',
    borderRadius: 16,
  },
  headerLabel: { color: '#71717a' },
  title: { color: '#ededf1' },
  subtitle: { color: '#71717a' },
  divider: { borderTop: '1px solid rgba(255,255,255,0.08)' },
  userLabel: { color: '#71717a' },
  userName: { color: '#ededf1' },
  positionBadge: { background: '#111113', color: '#ffffff' },
  playerName: { color: '#18181b' },
  rowBorder: '1px solid rgba(0,0,0,0.08)',
  footerText: { color: '#555' },
  footerDivider: { background: 'rgba(255,255,255,0.08)' },
  iconColor: '#666',
  pickhubColor: '#888',
};

const gradientStyles = {
  outer: {
    background: `
      radial-gradient(circle at 88% 10%, rgba(126,34,206,0.88) 0%, rgba(126,34,206,0.5) 22%, transparent 45%),
      radial-gradient(circle at 86% 88%, rgba(20,184,166,0.8) 0%, rgba(20,184,166,0.42) 24%, transparent 48%),
      radial-gradient(circle at 64% 58%, rgba(59,130,246,0.38) 0%, transparent 42%),
      linear-gradient(135deg, #030304 0%, #0b0412 42%, #150522 68%, #06171c 100%)
    `,
    border: '1px solid rgba(168,85,247,0.55)',
  },
  rankingPanel: {
    background: `
      linear-gradient(135deg, rgba(88,28,135,0.82) 0%, rgba(49,46,129,0.72) 48%, rgba(13,148,136,0.62) 100%)
    `,
    borderRadius: 16,
    border: '1px solid rgba(168,85,247,0.58)',
  },
  headerLabel: { color: '#a855f7' },
  title: { color: '#ffffff' },
  subtitle: { color: '#a855f7' },
  divider: { borderTop: '1px solid rgba(168,85,247,0.28)' },
  userLabel: { color: '#a855f7' },
  userName: { color: '#ffffff' },
  positionBadge: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 58%, #2dd4bf 100%)',
    color: '#ffffff',
  },
  playerName: { color: '#ffffff' },
  rowBorder: '1px solid rgba(255,255,255,0.12)',
  footerText: { color: '#a855f7' },
  footerDivider: { background: 'rgba(168,85,247,0.28)' },
  iconColor: '#a855f7',
  pickhubColor: '#ffffff',
};

const STYLES: Record<ReceiptTemplate, typeof classicStyles> = {
  classic: classicStyles,
  gradient: gradientStyles,
};

interface RankedPlayer {
  position: number;
  label: string;
  countryCode: string | null;
}

interface ReceiptCardProps {
  template: ReceiptTemplate;
  eventTitle: string;
  eventLogoUrl?: string | null;
  subtitle?: string;
  participantName: string;
  rankedPlayers: RankedPlayer[];
}

const PickHubBrandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 1024 1024" fill="none">
    <rect x="80" y="80" width="864" height="864" rx="220" fill="#A855F7" />
    <path d="M365 335C365 315.67 380.67 300 400 300H585C615.376 300 640 324.624 640 355V506L501.5 644.5C487.433 658.567 468.356 666.469 448.462 666.469H400C380.67 666.469 365 650.799 365 631.469L492.5 503.969L365 335Z" fill="white" />
  </svg>
);

interface RowSizing {
  panelHeight: number;
  rowHeight: number;
  badgeSize: number;
  badgeFontSize: number;
  playerFontSize: number;
  flagW: number;
  flagH: number;
}

function rowSizing(count: number): RowSizing {
  let rowHeight: number;
  let badgeSize: number;
  let badgeFontSize: number;
  let playerFontSize: number;
  let flagW: number;
  let flagH: number;

  if (count <= 4) {
    rowHeight = 88; badgeSize = 38; badgeFontSize = 18; playerFontSize = 20; flagW = 40; flagH = 26;
  } else if (count <= 6) {
    rowHeight = 62; badgeSize = 34; badgeFontSize = 16; playerFontSize = 18; flagW = 38; flagH = 25;
  } else if (count <= 8) {
    rowHeight = 48; badgeSize = 32; badgeFontSize = 15; playerFontSize = 17; flagW = 36; flagH = 24;
  } else if (count <= 10) {
    rowHeight = 44; badgeSize = 30; badgeFontSize = 14; playerFontSize = 16; flagW = 34; flagH = 23;
  } else {
    rowHeight = 40; badgeSize = 28; badgeFontSize = 13; playerFontSize = 14; flagW = 32; flagH = 22;
  }

  const panelHeight = count * rowHeight + 26;

  return { panelHeight, rowHeight, badgeSize, badgeFontSize, playerFontSize, flagW, flagH };
}

export function getReceiptDimensions(count: number) {
  const { panelHeight } = rowSizing(count);
  const height = 28 + 110 + 12 + 13 + 70 + 14 + panelHeight + 16 + 20 + 14;
  return { width: CARD_W, height };
}

function titleFontSize(title: string): number {
  if (title.length > 28) return 26;
  if (title.length > 18) return 30;
  return 34;
}

export const ReceiptCard = forwardRef<HTMLDivElement, ReceiptCardProps>(
  function ReceiptCard({ template, eventTitle, eventLogoUrl, subtitle, participantName, rankedPlayers }, ref) {
    const s = STYLES[template];
    const count = rankedPlayers.length;
    const { height: canvasH } = getReceiptDimensions(count);
    const { panelHeight, rowHeight, badgeSize, badgeFontSize, playerFontSize, flagW, flagH } = rowSizing(count);
    const titleSize = titleFontSize(eventTitle);

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: canvasH,
          borderRadius: BORDER_RADIUS,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          boxSizing: 'border-box',
          ...s.outer,
          padding: '28px 28px 14px',
        }}
      >
        {/* HEADER */}
        <div style={{ height: 110, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px', columnGap: 16, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: s.headerLabel.color, fontSize: 11, fontWeight: 600, letterSpacing: '2px', lineHeight: 1, marginBottom: 8, textTransform: 'uppercase' }}>
              Pick&rsquo;em
            </div>
            <h1 style={{
              fontSize: titleSize,
              fontWeight: 800,
              color: s.title.color,
              margin: 0,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              overflowWrap: 'anywhere',
            }}>
              {eventTitle}
            </h1>
            {subtitle && (
              <p style={{
                fontSize: 15,
                fontWeight: 500,
                color: s.subtitle.color,
                margin: '8px 0 0',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>
                {subtitle}
              </p>
            )}
          </div>

          {eventLogoUrl && (
            <div style={{ width: 150, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', alignSelf: 'flex-start' }}>
              <img
                src={eventLogoUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
              />
            </div>
          )}
        </div>

        {/* DIVIDER */}
        <div style={{ marginTop: 12, paddingTop: 12, ...s.divider }} />

        {/* USER */}
        <div style={{ height: 70, padding: '12px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: s.userLabel.color, fontSize: 10, fontWeight: 500, letterSpacing: '1px', marginBottom: 4, textTransform: 'uppercase' }}>
            Predicción de
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: s.userName.color,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {participantName}
          </div>
        </div>

        {/* RANKING PANEL */}
        <div style={{
          ...s.rankingPanel,
          boxSizing: 'border-box',
          marginTop: 14,
          height: panelHeight,
          padding: '13px 12px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {count === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', fontSize: 14, fontWeight: 500 }}>
              Sin selecciones
            </div>
          ) : (
            rankedPlayers.map((slot, i) => (
              <div
                key={i}
                style={{
                  height: rowHeight,
                  display: 'grid',
                  gridTemplateColumns: `${badgeSize}px minmax(0, 1fr) ${flagW}px`,
                  columnGap: 10,
                  alignItems: 'center',
                  borderBottom: i < count - 1 ? s.rowBorder : 'none',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: 8,
                  fontSize: badgeFontSize,
                  fontWeight: 700,
                  ...s.positionBadge,
                }}>
                  {slot.position}
                </div>

                <span style={{
                  fontSize: playerFontSize,
                  fontWeight: 600,
                  color: s.playerName.color,
                  lineHeight: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {slot.label}
                </span>

                <div style={{ width: flagW, height: flagH }}>
                  {slot.countryCode && (
                    <ReactCountryFlag
                      countryCode={slot.countryCode}
                      svg
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, display: 'block' }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          height: 20,
          marginTop: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}>
          <div style={{ width: 24, height: 1, ...s.footerDivider }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textTransform: 'uppercase',
          }}>
            <span style={{ color: s.footerText.color, fontSize: 8, fontWeight: 600, letterSpacing: '1.4px' }}>Powered by</span>
            <PickHubBrandIcon />
            <span style={{ color: s.pickhubColor, fontWeight: 700, fontSize: 9, letterSpacing: '0.8px' }}>PickHub</span>
          </div>
        </div>
      </div>
    );
  },
);
