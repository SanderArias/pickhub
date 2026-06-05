'use client';

import { forwardRef } from 'react';

export const CARD_W = 1080;
export const CARD_H = 1350;

interface PredictionShareCardProps {
  eventTitle: string;
  creatorLabel: string;
  questionTitle: string;
  selectedLabels: string[];
  isSingle: boolean;
  isTop8?: boolean;
}

function SingleSelection({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: 130,
        fontWeight: 800,
        color: '#EDEDF1',
        lineHeight: 1.1,
        letterSpacing: '-0.03em',
        display: 'block',
        wordBreak: 'break-word',
        maxWidth: '90%',
      }}
    >
      ⭐ {label.toUpperCase()}
    </span>
  );
}

function MultiSelection({ labels }: { labels: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {labels.map((label) => (
        <span
          key={label}
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#EDEDF1',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          ⭐ {label.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

function Top8Selection({ labels }: { labels: string[] }) {
  const items = labels.slice(0, 8);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {items.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', maxWidth: 600 }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'rgba(168,85,247,0.15)',
            color: '#C084FC',
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {i + 1}
          </span>
          <span style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#EDEDF1',
            lineHeight: 1.2,
          }}>
            {label.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

export const PredictionShareCard = forwardRef<HTMLDivElement, PredictionShareCardProps>(
  function PredictionShareCard({ eventTitle, creatorLabel, questionTitle, selectedLabels, isSingle, isTop8 }, ref) {
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
        {/* Center glow behind the answer */}
        <div style={{
          position: 'absolute',
          top: '42%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        {/* Subtle top-right accent */}
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
          padding: '32px 48px',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* ===== HEADER ===== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="10" fill="#A000FF" />
                <path d="M14 12L24 20L14 28" stroke="#EDEDF1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#808080', letterSpacing: '-0.02em' }}>
                PickHub
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#A0A0A0', margin: 0, fontWeight: 500 }}>
              {eventTitle} <span style={{ color: '#525252' }}>·</span> Organizado por {creatorLabel}
            </p>
          </div>

          {/* ===== CONTENT ===== */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <h2 style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#EDEDF1',
              margin: 0,
              lineHeight: 1.3,
              maxWidth: 800,
            }}>
              {questionTitle}
            </h2>

            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}>
              {isTop8 ? (
                <Top8Selection labels={selectedLabels.length > 0 ? selectedLabels : ['Sin selección']} />
              ) : isSingle ? (
                <SingleSelection label={selectedLabels[0] ?? '—'} />
              ) : (
                <MultiSelection labels={selectedLabels.length > 0 ? selectedLabels : ['Sin selección']} />
              )}
            </div>
          </div>

          {/* ===== FOOTER ===== */}
          <div style={{ textAlign: 'center', paddingBottom: 4 }}>
            <p style={{ fontSize: 12, color: '#525252', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Mi predicción
            </p>
          </div>
        </div>
      </div>
    );
  },
);
