// Kaswise mobile UI kit — Dark Luxury components (with light theme support)
// Tokens live in two flavors; `useKS()` hook picks the active one.
//
// Each component uses inline styles built from the active token set.
// Pure web React (the UI kit is a click-thru showcase, not RN).

const KS_DARK = {
  mode: 'dark',
  // Surfaces
  bgBase:    '#141414',
  bgSurface: '#1E1E1A',
  bgCard:    '#18181A',
  bgElevated:'#242427',
  bgDeep:    '#0A0A0A',
  // Text
  text:      '#FFFFFF',
  textSec:   '#E5E7EB',
  textMuted: '#9CA3AF',
  textDim:   '#6B7280',
  inverse:   '#0A0A0A',
  // Borders
  borderSoft:   'rgba(255,255,255,0.06)',
  border:       'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.18)',
  // Brand
  brand:       '#A3FF12',
  brandDeep:   '#65A30D',
  navy:        '#4A80F0',
  navyDeep:    '#2A5DD0',
  // Status
  success:  '#A3FF12',
  danger:   '#FF7B7B',
  warning:  '#FFC06D',
  info:     '#38BDF8',
  // Glass
  glassBg:     'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.12)',
  // Glows
  glowNeonSoft:   '0 0 22px rgba(163,255,18,0.30)',
  glowNeonStrong: '0 0 26px rgba(163,255,18,0.45), 0 14px 36px rgba(163,255,18,0.22)',
  focusRing:      '0 0 0 3px rgba(163,255,18,0.25)',
  focusRingDanger:'0 0 0 3px rgba(255,123,123,0.25)',
  // Currency colors
  amountPositive: '#A3FF12',
  amountNegative: '#FF7B7B',
  amountPending:  '#FFC06D',
};

const KS_LIGHT = {
  mode: 'light',
  bgBase:    '#F5F5F0',
  bgSurface: '#FFFFFF',
  bgCard:    '#FFFFFF',
  bgElevated:'#FAFAF5',
  bgDeep:    '#ECECE5',
  text:      '#0A0A0A',
  textSec:   '#4B5563',
  textMuted: '#6B7280',
  textDim:   '#9CA3AF',
  inverse:   '#FFFFFF',
  borderSoft:   'rgba(10,10,10,0.06)',
  border:       'rgba(10,10,10,0.10)',
  borderStrong: 'rgba(10,10,10,0.16)',
  brand:       '#A3FF12',
  brandDeep:   '#65A30D',
  navy:        '#4A80F0',
  navyDeep:    '#2A5DD0',
  success:  '#65A30D',
  danger:   '#DC2626',
  warning:  '#B45309',
  info:     '#0284C7',
  glassBg:     'rgba(255,255,255,0.60)',
  glassBorder: 'rgba(10,10,10,0.08)',
  glowNeonSoft:   '0 6px 16px rgba(163,255,18,0.25)',
  glowNeonStrong: '0 12px 28px rgba(163,255,18,0.40)',
  focusRing:      '0 0 0 3px rgba(101,163,13,0.30)',
  focusRingDanger:'0 0 0 3px rgba(220,38,38,0.20)',
  amountPositive: '#65A30D',
  amountNegative: '#DC2626',
  amountPending:  '#B45309',
};

const ksFont = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
const ksMono = `ui-monospace, SFMono-Regular, Menlo, monospace`;

// ── Theme context ─────────────────────────────────────────────
const KSContext = React.createContext(KS_DARK);
const useKS = () => React.useContext(KSContext);

function KSProvider({ mode, children }) {
  const value = mode === 'light' ? KS_LIGHT : KS_DARK;
  return <KSContext.Provider value={value}>{children}</KSContext.Provider>;
}

// ── Phosphor icon helper
function PhIcon({ name, weight = 'regular', size = 18, color, style }) {
  const cls = `ph-${weight} ph-${name}`;
  return <i className={cls} style={{ fontSize: size, color, lineHeight: 1, display: 'inline-block', ...style }} />;
}

// ── IconBubble — dark recipe: tinted bg + matching border + full fg icon
function IconBubble({ name, tone = 'primary', size = 38, weight = 'bold' }) {
  const t = useKS();
  const tones = {
    primary: { bg: hexA(t.brand,   0.14), bd: hexA(t.brand,   0.25), fg: t.mode === 'light' ? t.brandDeep : t.brand },
    navy:    { bg: hexA(t.navy,    0.14), bd: hexA(t.navy,    0.30), fg: t.mode === 'light' ? t.navyDeep  : t.navy  },
    success: { bg: hexA(t.success, 0.14), bd: hexA(t.success, 0.25), fg: t.success },
    warning: { bg: hexA(t.warning, 0.14), bd: hexA(t.warning, 0.30), fg: t.warning },
    danger:  { bg: hexA(t.danger,  0.14), bd: hexA(t.danger,  0.30), fg: t.danger  },
    info:    { bg: hexA(t.info,    0.14), bd: hexA(t.info,    0.30), fg: t.info    },
    neutral: { bg: t.mode === 'light' ? 'rgba(10,10,10,0.05)' : 'rgba(255,255,255,0.05)',
               bd: t.mode === 'light' ? 'rgba(10,10,10,0.08)' : 'rgba(255,255,255,0.08)',
               fg: t.textMuted },
  };
  const c = tones[tone] || tones.primary;
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: c.bg, border: `1px solid ${c.bd}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <PhIcon name={name} weight={weight} size={Math.round(size * 0.5)} color={c.fg} />
    </div>
  );
}

// Helper: hex to rgba string. Accepts #RGB / #RRGGBB.
function hexA(hex, alpha) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Buttons
function PrimaryButton({ label, onPress, disabled, loading, full = true, icon }) {
  const t = useKS();
  return (
    <button onClick={!disabled && !loading ? onPress : undefined} disabled={disabled || loading}
      style={{
        width: full ? '100%' : undefined,
        background: t.brand, color: '#0A0A0A',
        border: 'none', borderRadius: 999,
        padding: '14px 22px',
        fontSize: 14, fontWeight: 800, fontFamily: ksFont,
        letterSpacing: 0.2,
        cursor: disabled || loading ? 'default' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        boxShadow: t.glowNeonStrong,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
      {icon && <PhIcon name={icon} weight="bold" size={16} color="#0A0A0A" />}
      {loading ? '…' : label}
    </button>
  );
}

function SecondaryButton({ label, onPress, full = true }) {
  const t = useKS();
  return (
    <button onClick={onPress} style={{
      width: full ? '100%' : undefined,
      background: t.glassBg, color: t.text,
      border: `1px solid ${t.glassBorder}`, borderRadius: 999,
      padding: '14px 22px', fontSize: 14, fontWeight: 700, fontFamily: ksFont,
      cursor: 'pointer', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    }}>{label}</button>
  );
}

function GhostButton({ label, onPress }) {
  const t = useKS();
  return (
    <button onClick={onPress} style={{
      background: 'transparent', color: t.textMuted, border: 'none',
      padding: '12px 16px', fontSize: 13, fontWeight: 700, fontFamily: ksFont, cursor: 'pointer',
    }}>{label}</button>
  );
}

// ── Pills, badges, chips
function Pill({ text, active, onClick, tone }) {
  const t = useKS();
  const bg = active ? t.brand : t.glassBg;
  const color = active ? '#0A0A0A' : t.textSec;
  const border = active ? t.brand : t.glassBorder;
  return (
    <span onClick={onClick} style={{
      background: bg, color, border: `1px solid ${border}`,
      borderRadius: 999, padding: '7px 14px',
      fontSize: 12, fontWeight: active ? 800 : 700, fontFamily: ksFont,
      cursor: onClick ? 'pointer' : 'default',
      userSelect: 'none', whiteSpace: 'nowrap',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    }}>{text}</span>
  );
}

function StatusBadge({ text, tone = 'neutral' }) {
  const t = useKS();
  const map = {
    success: t.success, danger: t.danger, warning: t.warning, info: t.info, neutral: t.textMuted,
  };
  const c = map[tone] || t.textMuted;
  return (
    <span style={{
      background: hexA(c, 0.14),
      border: `1px solid ${hexA(c, 0.40)}`,
      color: c, padding: '4px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 800, letterSpacing: 0.4,
      fontFamily: ksFont,
    }}>{text}</span>
  );
}

// ── Glass wallet selector pill
function WalletPill({ label = 'Main Wallet', onClick }) {
  const t = useKS();
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: t.glassBg, border: `1px solid ${t.glassBorder}`,
      borderRadius: 999, padding: '7px 12px',
      fontSize: 12, fontWeight: 700, color: t.text, fontFamily: ksFont,
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      cursor: 'pointer',
    }}>
      <PhIcon name="wallet" weight="bold" size={13} color={t.textMuted} />
      {label}
      <PhIcon name="caret-down" weight="bold" size={10} color={t.textDim} />
    </span>
  );
}

// ── Neon delta pill (+15% growth indicator)
function DeltaPill({ value = '15%', trend = 'up' }) {
  const t = useKS();
  const positive = trend === 'up';
  const color = positive ? t.success : t.danger;
  const bg = positive ? hexA(t.brand, t.mode === 'light' ? 0.20 : 0.14) : hexA(t.danger, 0.14);
  const textColor = t.mode === 'light' && positive ? '#0A0A0A' : color;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg, borderRadius: 6, padding: '3px 8px',
      fontSize: 10, fontWeight: 800, color: textColor, fontFamily: ksFont,
    }}>
      <PhIcon name={positive ? 'trend-up' : 'trend-down'} weight="bold" size={11} color={positive ? (t.mode === 'light' ? t.brandDeep : t.brand) : t.danger} />
      {value}
    </span>
  );
}

// ── ProgressBar (with glow on the fill)
function ProgressBar({ value, tone = 'ok' }) {
  const t = useKS();
  const color = tone === 'ok' ? t.success : tone === 'warn' ? t.warning : t.danger;
  return (
    <div style={{ height: 6, background: t.mode === 'light' ? 'rgba(10,10,10,0.06)' : 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 999,
        boxShadow: tone === 'ok' ? `0 0 10px ${hexA(color, 0.50)}` : `0 0 8px ${hexA(color, 0.40)}`,
      }} />
    </div>
  );
}

// ── ScreenHeader + SectionCard
function ScreenHeader({ title, subtitle, action, onActionPress }) {
  const t = useKS();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: t.text, letterSpacing: -0.5, fontFamily: ksFont }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2, fontFamily: ksFont }}>{subtitle}</div>}
      </div>
      {action && (
        <button onClick={onActionPress} style={{
          background: t.brand, color: '#0A0A0A', border: 'none',
          borderRadius: 999, padding: '8px 14px',
          fontSize: 12, fontWeight: 800, fontFamily: ksFont, cursor: 'pointer',
          boxShadow: t.glowNeonSoft,
        }}>{action}</button>
      )}
    </div>
  );
}

function SectionCard({ title, action, onActionPress, children }) {
  const t = useKS();
  return (
    <div style={{
      background: t.bgCard, border: `1px solid ${t.borderSoft}`, borderRadius: 18,
      padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: t.mode === 'light' ? '0 1px 3px rgba(10,10,10,0.04)' : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: ksFont }}>{title}</div>
        {action && (
          <span onClick={onActionPress} style={{
            color: t.mode === 'light' ? t.brandDeep : t.brand,
            fontSize: 12, fontWeight: 700, fontFamily: ksFont,
            cursor: onActionPress ? 'pointer' : 'default',
          }}>{action}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── TransactionRow
function TransactionRow({ icon, tone = 'neutral', merchant, sublabel, amount, positive, pending, isLast }) {
  const t = useKS();
  const color = pending ? t.amountPending : positive ? t.amountPositive : t.amountNegative;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
      borderBottom: isLast ? 'none' : `1px solid ${t.borderSoft}`,
    }}>
      <IconBubble name={icon} tone={tone} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: ksFont }}>{merchant}</div>
        {sublabel && <div style={{ fontSize: 11, color: t.textDim, marginTop: 2, fontFamily: ksFont }}>{sublabel}</div>}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 800, color, fontFamily: ksFont, fontVariantNumeric: 'tabular-nums',
      }}>{amount}</div>
    </div>
  );
}

// ── HeroBalance (Wallet hero with neon delta + bloom)
function HeroBalance({ amount = 'Rp 4.250.000', stats = [], walletLabel = 'Main Wallet', onManage, deltaValue = '15%' }) {
  const t = useKS();
  return (
    <div style={{
      background: t.bgCard, borderRadius: 24, padding: 18,
      border: `1px solid ${t.borderSoft}`,
      position: 'relative', overflow: 'hidden',
      boxShadow: t.mode === 'light' ? '0 8px 24px rgba(10,10,10,0.06)' : 'none',
    }}>
      {/* corner blooms */}
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexA(t.brand, t.mode === 'light' ? 0.22 : 0.14)}, transparent 70%)`,
        filter: 'blur(24px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -60, width: 180, height: 180, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexA(t.navy, 0.10)}, transparent 70%)`,
        filter: 'blur(24px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <WalletPill label={walletLabel} />
        <span onClick={onManage} style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: ksFont, cursor: 'pointer' }}>Manage</span>
      </div>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: ksFont, marginBottom: 4 }}>Total saldo</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            fontSize: 30, fontWeight: 800, color: t.text, letterSpacing: -0.6,
            fontVariantNumeric: 'tabular-nums', fontFamily: ksFont,
          }}>{amount}</div>
          <DeltaPill value={deltaValue} trend="up" />
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            flex: 1, background: t.mode === 'light' ? t.bgBase : 'rgba(255,255,255,0.04)',
            border: `1px solid ${t.borderSoft}`, borderRadius: 14, padding: 10,
          }}>
            <div style={{ fontSize: 10, color: t.textMuted, fontFamily: ksFont }}>{s.label}</div>
            <div style={{
              fontSize: 14, fontWeight: 800, color: s.color || t.text,
              fontVariantNumeric: 'tabular-nums', fontFamily: ksFont, marginTop: 2,
            }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── QuickActionCard
function QuickActionCard({ icon, label, onClick, tone = 'primary', active }) {
  const t = useKS();
  return (
    <button onClick={onClick} style={{
      flex: 1, background: t.bgCard, borderRadius: 16,
      border: `1px solid ${active ? hexA(t.brand, 0.30) : t.borderSoft}`,
      padding: '12px 8px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      cursor: 'pointer', fontFamily: ksFont,
      boxShadow: active ? t.glowNeonSoft : 'none',
    }}>
      <IconBubble name={icon} tone={tone} size={32} />
      <span style={{ fontSize: 11, fontWeight: 700, color: t.textSec }}>{label}</span>
    </button>
  );
}

// ── BudgetCard
function BudgetCard({ icon, tone = 'primary', title, meta, pct, value, barTone, footer, highlight }) {
  const t = useKS();
  const pctColor = barTone === 'warn' ? t.warning : barTone === 'over' ? t.danger : t.success;
  return (
    <div style={{
      background: t.bgCard,
      border: `1px solid ${highlight ? hexA(t.danger, 0.20) : t.borderSoft}`,
      borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: highlight ? `0 0 20px ${hexA(t.danger, 0.10)} inset` : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <IconBubble name={icon} tone={tone} size={32} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: ksFont }}>{title}</div>
            <div style={{ fontSize: 10, color: t.textDim, fontVariantNumeric: 'tabular-nums', fontFamily: ksFont, marginTop: 2 }}>{meta}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: pctColor, fontVariantNumeric: 'tabular-nums', fontFamily: ksFont }}>{pct}</div>
      </div>
      <ProgressBar value={value} tone={barTone} />
      <div style={{ fontSize: 10, color: highlight ? t.danger : t.textDim, fontFamily: ksFont }}>{footer}</div>
    </div>
  );
}

// ── MetricCard
function MetricCard({ label, value, color }) {
  const t = useKS();
  return (
    <div style={{
      flex: 1, background: t.bgCard, border: `1px solid ${t.borderSoft}`,
      borderRadius: 16, padding: 14, fontFamily: ksFont,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color || t.text, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

// ── MonthChip
function MonthChip({ label, active, onClick }) {
  const t = useKS();
  return (
    <button onClick={onClick} style={{
      flex: 1,
      background: active ? hexA(t.brand, 0.12) : t.glassBg,
      border: `1px solid ${active ? hexA(t.brand, 0.35) : t.glassBorder}`,
      borderRadius: 12, padding: '10px 0', fontFamily: ksFont,
      fontSize: 12, fontWeight: active ? 800 : 700,
      color: active ? (t.mode === 'light' ? t.brandDeep : t.brand) : t.textMuted,
      cursor: 'pointer',
    }}>{label}</button>
  );
}

// ── InputField
function InputField({ label, value, onChange, placeholder, type = 'text', error }) {
  const t = useKS();
  const [focused, setFocused] = React.useState(false);
  const accent = error ? t.danger : focused ? t.brand : t.border;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: ksFont }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase',
        color: error ? t.danger : focused ? (t.mode === 'light' ? t.brandDeep : t.brand) : t.textMuted,
      }}>{label}</div>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          background: error ? hexA(t.danger, 0.06) : t.bgCard,
          border: `1px solid ${accent}`, borderRadius: 12,
          padding: '12px 14px', fontSize: 14, color: t.text,
          outline: 'none', fontFamily: ksFont,
          boxShadow: focused && !error ? t.focusRing : error ? t.focusRingDanger : 'none',
          transition: 'box-shadow 120ms ease, border-color 120ms ease',
        }}
      />
      {error && <div style={{ fontSize: 11, color: t.danger }}>{error}</div>}
    </div>
  );
}

// ── BottomTabs + FAB
function BottomTabs({ active, onChange, onFab }) {
  const t = useKS();
  const tabs = [
    { key: 'home',         icon: 'house',          label: 'Beranda' },
    { key: 'transactions', icon: 'list-dashes',    label: 'Transaksi' },
    { key: '_fab' },
    { key: 'reports',      icon: 'chart-line-up',  label: 'Laporan' },
    { key: 'settings',     icon: 'gear',           label: 'Setelan' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: t.bgCard,
      borderTop: `1px solid ${t.borderSoft}`,
      padding: '14px 10px 22px',
      display: 'flex', alignItems: 'center',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      {tabs.map(tab => {
        if (tab.key === '_fab') {
          return (
            <div key="fab" style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <button onClick={onFab} style={{
                width: 54, height: 54, borderRadius: 27,
                background: t.brand, border: 'none',
                position: 'absolute', top: -24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: t.glowNeonStrong,
                cursor: 'pointer',
              }}>
                <PhIcon name="plus" weight="bold" size={24} color="#0A0A0A" />
              </button>
            </div>
          );
        }
        const isActive = active === tab.key;
        return (
          <button key={tab.key} onClick={() => onChange(tab.key)} style={{
            flex: 1, background: 'transparent', border: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, cursor: 'pointer', padding: 0,
            fontFamily: ksFont,
          }}>
            <PhIcon name={tab.icon} weight={isActive ? 'fill' : 'regular'} size={22}
              color={isActive ? t.brand : t.textMuted} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 800 : 600, color: isActive ? t.brand : t.textMuted }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Share with other Babel scripts
Object.assign(window, {
  KS_DARK, KS_LIGHT, ksFont, ksMono, hexA,
  KSProvider, useKS,
  PhIcon, IconBubble, WalletPill, DeltaPill,
  PrimaryButton, SecondaryButton, GhostButton,
  Pill, StatusBadge, ProgressBar,
  ScreenHeader, SectionCard, TransactionRow,
  HeroBalance, QuickActionCard,
  BudgetCard, MetricCard, MonthChip, InputField, BottomTabs,
});
