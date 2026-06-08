'use client';

import { forwardRef } from 'react';
import ReactCountryFlag from 'react-country-flag';
import type { ReceiptTemplate } from '@/lib/receipt-templates';

export const CARD_W = 1080;
export const CARD_H = 1350;

const PX = 32;
const BORDER_RADIUS = 28;
const BORDER_W = 2;

const classicStyles = {
  outer: {
    background: '#09090b',
    border: `${BORDER_W}px solid #27272a`,
  },
  rankingPanel: {
    background: '#f4f4f0',
    borderRadius: 20,
  },
  label: { color: '#71717a' },
  title: { color: '#ededf1' },
  subtitle: { color: '#71717a' },
  divider: { background: 'rgba(255,255,255,0.08)' },
  userLabel: { color: '#71717a' },
  userName: { color: '#ededf1' },
  positionBadge: { background: '#18181b', color: '#ffffff' },
  playerName: { color: '#18181b' },
  rowBorder: '1px solid #deded8',
  footerText: { color: '#555' },
  footerDivider: { background: 'rgba(255,255,255,0.08)' },
  iconColor: '#666',
  pickhubColor: '#888',
};

const gradientStyles = {
  outer: {
    background: `
      radial-gradient(circle at 88% 10%, rgba(126,34,206,0.95) 0%, rgba(126,34,206,0.58) 22%, transparent 46%),
      radial-gradient(circle at 86% 88%, rgba(20,184,166,0.92) 0%, rgba(20,184,166,0.5) 25%, transparent 50%),
      radial-gradient(circle at 65% 60%, rgba(59,130,246,0.48) 0%, transparent 43%),
      linear-gradient(135deg, #030304 0%, #09040f 40%, #150523 68%, #06171c 100%)
    `,
    border: `${BORDER_W}px solid rgba(168,85,247,0.55)`,
  },
  rankingPanel: {
    background: `
      linear-gradient(135deg, rgba(88,28,135,0.86) 0%, rgba(49,46,129,0.72) 46%, rgba(13,148,136,0.68) 100%)
    `,
    borderRadius: 20,
    border: '1px solid rgba(168,85,247,0.65)',
  },
  label: { color: '#a855f7' },
  title: { color: '#ffffff' },
  subtitle: { color: '#a855f7' },
  divider: { background: 'rgba(168,85,247,0.28)' },
  userLabel: { color: '#a855f7' },
  userName: { color: '#ffffff' },
  positionBadge: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 58%, #2dd4bf 100%)',
    color: '#ffffff',
  },
  playerName: { color: '#ffffff' },
  rowBorder: '1px solid rgba(255,255,255,0.14)',
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

const PickHubIcon = ({ color }: { color: string }) => (
  <svg width="28" height="28" viewBox="0 0 1024 1024" fill="none">
    <rect x="80" y="80" width="864" height="864" rx="220" fill={color} />
    <path d="M365 335C365 315.67 380.67 300 400 300H585C615.376 300 640 324.624 640 355V506L501.5 644.5C487.433 658.567 468.356 666.469 448.462 666.469H400C380.67 666.469 365 650.799 365 631.469L492.5 503.969L365 335Z" fill="white" />
  </svg>
);

function rowSizing(count: number) {
  if (count <= 6) {
    return { rowHeight: 63, badgeSize: 36, badgeFontSize: 18, playerFontSize: 20, flagW: 42, flagH: 26 };
  }
  if (count <= 8) {
    return { rowHeight: 55, badgeSize: 34, badgeFontSize: 17, playerFontSize: 19, flagW: 40, flagH: 25 };
  }
  return { rowHeight: 47, badgeSize: 30, badgeFontSize: 15, playerFontSize: 17, flagW: 38, flagH: 24 };
}

export const ReceiptCard = forwardRef<HTMLDivElement, ReceiptCardProps>(
  function ReceiptCard({ template, eventTitle, eventLogoUrl, subtitle, participantName, rankedPlayers }, ref) {
    const s = STYLES[template];
    const count = rankedPlayers.length;
    const { rowHeight, badgeSize, badgeFontSize, playerFontSize, flagW, flagH } = rowSizing(count);
    const rowGap = count > 8 ? 0 : 1;

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: BORDER_RADIUS,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          ...s.outer,
          padding: `${PX}px ${PX}px 24px`,
        }}
      >
        {/* TOP: header + user block */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <div>
            <div style={{ color: s.label.color, fontSize: 14, fontWeight: 600, letterSpacing: '0.18em', marginBottom: 6, textTransform: 'uppercase' }}>
              Pick&rsquo;em
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)', gap: 24, alignItems: 'start' }}>
              <div style={{ minWidth: 0 }}>
                <h1 style={{
                  fontSize: 58,
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
                  marginBottom: 6,
                }}>
                  {eventTitle}
                </h1>
                {subtitle && (
                  <p style={{
                    fontSize: 20,
                    fontWeight: 500,
                    color: s.subtitle.color,
                    margin: 0,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    {subtitle}
                  </p>
                )}
              </div>
              {eventLogoUrl && (
                <div style={{
                  width: '100%',
                  height: 145,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'visible',
                  alignSelf: 'flex-start',
                }}>
                  <img
                    src={eventLogoUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* DIVIDER 1 */}
          <div style={{ margin: '16px 0 14px', height: 1, ...s.divider }} />

          {/* PARTICIPANT */}
          <div>
            <div style={{ color: s.userLabel.color, fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>
              Predicci&oacute;n de
            </div>
            <div style={{
              fontSize: 36,
              fontWeight: 700,
              color: s.userName.color,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {participantName}
            </div>
          </div>

          {/* DIVIDER 2 */}
          <div style={{ margin: '14px 0 0', height: 1, ...s.divider }} />
        </div>

        {/* RANKING PANEL */}
        <div style={{
          ...s.rankingPanel,
          marginTop: 16,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: rowGap,
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
                  gap: count > 8 ? 12 : 14,
                  height: rowHeight,
                  borderBottom: i < count - 1 ? s.rowBorder : 'none',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: 10,
                  fontSize: badgeFontSize,
                  fontWeight: 700,
                  flexShrink: 0,
                  ...s.positionBadge,
                }}>
                  {slot.position}
                </div>

                <span style={{
                  flex: 1,
                  fontSize: playerFontSize,
                  fontWeight: 650,
                  color: s.playerName.color,
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {slot.label}
                </span>

                {slot.countryCode ? (
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <ReactCountryFlag
                      countryCode={slot.countryCode}
                      svg
                      style={{ width: `${flagW}px`, height: `${flagH}px`, borderRadius: 5, display: 'block' }}
                    />
                  </span>
                ) : (
                  <span style={{ width: flagW, height: flagH, flexShrink: 0 }} />
                )}
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 22,
        }}>
          <div style={{ width: 48, height: 1, ...s.footerDivider }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: s.footerText.color,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>
            <span>Powered by</span>
            <PickHubIcon color={s.iconColor} />
            <span style={{ color: s.pickhubColor, fontWeight: 700 }}>PickHub</span>
          </div>
        </div>
      </div>
    );
  },
);
