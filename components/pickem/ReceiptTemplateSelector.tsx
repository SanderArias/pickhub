'use client';

import type { ReceiptTemplate } from '@/lib/receipt-templates';
import { RECEIPT_TEMPLATES } from '@/lib/receipt-templates';

const PREVIEW_STYLES = {
  classic: {
    outer: {
      background: 'radial-gradient(circle at 85% 0%, rgba(255,255,255,0.04), transparent 35%), #09090b',
      border: '1px solid #27272a',
    },
    label: '#71717a' as const,
    title: '#ededf1' as const,
    subtitle: '#71717a' as const,
    divider: 'rgba(255,255,255,0.06)',
    userLabel: '#71717a' as const,
    userName: '#ededf1' as const,
    rankingPanel: '#f4f4f0' as const,
    badge: '#111113' as const,
    badgeText: '#ffffff' as const,
    playerName: '#18181b' as const,
    rowBorder: '#deded8',
    flagPlaceholder: '#e0e0d8' as const,
    flagText: 'rgba(0,0,0,0.18)' as const,
    footerText: '#555' as const,
    footerIcon: '#666' as const,
    pickhubText: '#888' as const,
    logoBg: '#1f1f23' as const,
  },
  gradient: {
    outer: {
      background: `
        radial-gradient(circle at 88% 8%, rgba(126,34,206,0.78), transparent 38%),
        radial-gradient(circle at 88% 88%, rgba(20,184,166,0.68), transparent 44%),
        radial-gradient(circle at 64% 58%, rgba(59,130,246,0.38), transparent 42%),
        linear-gradient(135deg, #050506 0%, #11051b 46%, #071923 100%)
      `,
      border: '1px solid rgba(168,85,247,0.55)',
    },
    label: '#a855f7' as const,
    title: '#ffffff' as const,
    subtitle: '#a855f7' as const,
    divider: 'rgba(168,85,247,0.28)',
    userLabel: '#a855f7' as const,
    userName: '#ffffff' as const,
    rankingPanel: 'linear-gradient(135deg, rgba(88,28,135,0.78) 0%, rgba(49,46,129,0.66) 45%, rgba(13,148,136,0.58) 100%)',
    badge: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 58%, #2dd4bf 100%)',
    badgeText: '#ffffff' as const,
    playerName: '#ffffff' as const,
    rowBorder: 'rgba(255,255,255,0.14)',
    flagPlaceholder: 'rgba(255,255,255,0.1)' as const,
    flagText: 'rgba(255,255,255,0.35)' as const,
    footerText: '#a855f7' as const,
    footerIcon: '#a855f7' as const,
    pickhubText: '#ffffff' as const,
    logoBg: 'rgba(255,255,255,0.06)' as const,
  },
} as const;

const PICKHUB_SMALL = (color: string) =>
  `<svg width="8" height="8" viewBox="0 0 1024 1024"><rect x="80" y="80" width="864" height="864" rx="220" fill="${color}"/><path d="M365 335C365 315.67 380.67 300 400 300H585C615.376 300 640 324.624 640 355V506L501.5 644.5C487.433 658.567 468.356 666.469 448.462 666.469H400C380.67 666.469 365 650.799 365 631.469L492.5 503.969L365 335Z" fill="white"/></svg>`;

function Preview({ variant }: { variant: 'classic' | 'gradient' }) {
  const s = PREVIEW_STYLES[variant];

  return (
    <div
      style={{
        alignSelf: 'center',
        width: 'auto',
        height: 220,
        aspectRatio: '4 / 5',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        ...s.outer,
      }}
    >
      {/* Header */}
      <div style={{ padding: '10px 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: s.label, fontWeight: 600, letterSpacing: '0.12em', fontSize: 5, textTransform: 'uppercase' }}>PICK&rsquo;EM</div>
          <div style={{ color: s.title, fontWeight: 800, fontSize: 13, lineHeight: 1.2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Título</div>
          <div style={{ color: s.subtitle, fontWeight: 500, letterSpacing: '0.06em', fontSize: 6, textTransform: 'uppercase', marginTop: 1 }}>FINALISTAS</div>
        </div>
        <div style={{
          width: 56,
          height: 40,
          borderRadius: 6,
          background: s.logoBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginLeft: 8,
          fontSize: 6,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: variant === 'classic' ? '#555' : 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
        }}>
          LOGO
        </div>
      </div>

      {/* Divider */}
      <div style={{ margin: '4px 10px 2px', height: 1, background: s.divider }} />

      {/* User block */}
      <div style={{ padding: '0 10px' }}>
        <div style={{ color: s.userLabel, fontWeight: 500, fontSize: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>PREDICCIÓN DE</div>
        <div style={{ color: s.userName, fontWeight: 700, fontSize: 10, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>usuario</div>
      </div>

      {/* Divider */}
      <div style={{ margin: '3px 10px 0', height: 1, background: s.divider }} />

      {/* Ranking panel */}
      <div style={{
        flex: 1,
        margin: '4px 8px 0',
        borderRadius: 6,
        background: s.rankingPanel,
        padding: '5px 7px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {[1, 2, 3].map((pos) => (
          <div key={pos} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            borderBottom: pos < 3 ? `0.5px solid ${s.rowBorder}` : 'none',
            paddingBottom: pos < 3 ? 2 : 0,
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: 4,
              background: s.badge, color: s.badgeText,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 7, fontWeight: 700, flexShrink: 0,
            }}>
              {pos}
            </div>
            <div style={{
              flex: 1, color: s.playerName, fontWeight: 600, fontSize: 8,
              lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              Jugador {pos}
            </div>
            <div style={{
              width: 24, height: 14, borderRadius: 2,
              background: s.flagPlaceholder, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 5, fontWeight: 700, color: s.flagText,
              letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1,
            }}>
              FLAG
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '3px 10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{ width: 14, height: 1, background: s.divider }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: s.footerText, fontSize: 5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          dangerouslySetInnerHTML={{
            __html: `Powered by ${PICKHUB_SMALL(s.footerIcon)} <span style="color:${s.pickhubText};font-weight:700">PickHub</span>`
          }}
        />
      </div>
    </div>
  );
}

export function ReceiptTemplateSelector({
  value,
  onChange,
}: {
  value: ReceiptTemplate;
  onChange: (v: ReceiptTemplate) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-text-secondary">Diseño del comprobante</legend>
      <p className="text-xs text-text-muted">Elige cómo se verá la imagen que compartirán los participantes.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {RECEIPT_TEMPLATES.map((tpl) => {
          const selected = value === tpl.value;
          return (
            <label
              key={tpl.value}
              className={`group relative flex min-h-[312px] cursor-pointer flex-col rounded-xl border p-3 transition-all duration-150 ${
                selected
                  ? 'border-purple-primary bg-[rgba(168,85,247,0.06)] shadow-[0_0_0_1px_rgba(168,85,247,0.22)]'
                  : 'border-border bg-surface hover:border-border-hover'
              }`}
            >
              <input
                type="radio"
                name="receipt_template"
                value={tpl.value}
                checked={selected}
                onChange={() => onChange(tpl.value)}
                className="peer absolute inset-0 z-0 cursor-pointer opacity-0"
                aria-describedby={`tpl-desc-${tpl.value}`}
              />
              <div className="relative z-10 flex flex-1 flex-col gap-3">
                <Preview variant={tpl.value} />
                <div className="mt-1 flex items-start gap-3">
                  <div className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    selected ? 'border-purple-primary bg-purple-primary' : 'border-border group-hover:border-text-muted'
                  }`}>
                    {selected && (
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8L6.5 10.5L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary">{tpl.label}</span>
                      {selected && (
                        <span className="inline-flex items-center rounded-full border border-[rgba(168,85,247,0.28)] bg-[rgba(168,85,247,0.12)] px-2 py-0.5 text-[11px] font-semibold text-[#c084fc]">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <span id={`tpl-desc-${tpl.value}`} className="text-xs leading-relaxed text-text-muted">
                      {tpl.description}
                    </span>
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
