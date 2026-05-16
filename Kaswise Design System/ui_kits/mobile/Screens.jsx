// Kaswise mobile UI kit — full screens
// Click-thru: Splash → Login → Tabs (Home/Transactions/Budgets/Reports/Settings) + ManualTransaction

const SCREEN_PAD = 16;
const screenContainer = {
  padding: SCREEN_PAD, paddingBottom: 110,
  display: 'flex', flexDirection: 'column', gap: 14,
  fontFamily: ksFont,
  background: KS.bgBase, minHeight: '100%',
};

// ─── Splash ───
function SplashScreen({ onPrimary, onSecondary }) {
  return (
    <div style={{
      flex: 1, padding: 24,
      background: '#1D4ED8', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', minHeight: '100%',
      fontFamily: ksFont,
    }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90, background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 160, height: 160, borderRadius: 80, background: 'rgba(255,255,255,0.08)' }} />

      <img src="../../assets/logo-kaswise-mark.svg" width="64" height="64" alt=""
        style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.24)', borderRadius: 18, padding: 8, marginBottom: 20 }} />

      <div style={{ color: '#FFF', fontSize: 34, fontWeight: 800, letterSpacing: -0.6, marginBottom: 8 }}>Catat.in</div>
      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.55, textAlign: 'center', marginBottom: 26, maxWidth: 280 }}>
        Catat keuanganmu dengan<br/>mudah, cerdas, dan menyenangkan.
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <WhiteButton label="Mulai gratis" onPress={onPrimary} />
        <GhostButton label="Sudah punya akun? Masuk" onPress={onSecondary} light />
      </div>
    </div>
  );
}

// ─── Login ───
function LoginScreen({ onLogin, onBack, onRegister }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState(null);
  const submit = () => {
    if (!email || !password) { setError('Lengkapi email dan password dulu.'); return; }
    onLogin();
  };
  return (
    <div style={{
      padding: 20, paddingTop: 32, paddingBottom: 32,
      display: 'flex', flexDirection: 'column', gap: 22,
      background: KS.bgBase, minHeight: '100%', fontFamily: ksFont,
    }}>
      {/* Hero panel */}
      <div style={{
        background: KS.bgMuted, borderRadius: 20, border: `1px solid ${KS.border}`,
        padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <IconBubble name="lock" tone="primary" size={50} />
          <div style={{ flex: 1 }}>
            <div style={{ color: KS.brand, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>Kaswise</div>
            <div style={{ color: KS.text, fontSize: 20, fontWeight: 800, lineHeight: 1.25, marginTop: 2 }}>
              Catat keuangan, tetap tenang, tetap rapi.
            </div>
          </div>
        </div>
        <div style={{ color: KS.secondary, fontSize: 13, lineHeight: 1.55 }}>
          Masuk ke ruang finansialmu dengan tampilan ringkas dan fokus ke hal penting tiap hari.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFF', border: `1px solid ${KS.border}`, borderRadius: 999, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: KS.secondary }}>
            <PhIcon name="wallet" weight="bold" size={13} color={KS.success} /> Wallet rapi
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFF', border: `1px solid ${KS.border}`, borderRadius: 999, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: KS.secondary }}>
            <PhIcon name="chart-bar" weight="bold" size={13} color={KS.info} /> Insight cepat
          </span>
        </div>
      </div>

      {/* Form card */}
      <div style={{
        background: '#FFF', borderRadius: 20, border: `1px solid ${KS.border}`,
        padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: KS.text }}>Masuk ke akunmu</div>
          <div style={{ fontSize: 13, color: KS.secondary, marginTop: 4 }}>Lanjutkan ke dashboard Kaswise.</div>
        </div>

        <InputField label="EMAIL" value={email} onChange={setEmail} placeholder="email@contoh.com" type="email" />
        <InputField label="PASSWORD" value={password} onChange={setPassword} placeholder="••••••••" type="password" error={error} />

        <PrimaryButton label="Masuk" onPress={submit} />

        <div style={{ textAlign: 'right' }}>
          <a onClick={onBack} style={{ color: KS.secondary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Lupa password?</a>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 13, color: KS.muted }}>
        Belum punya akun? <a onClick={onRegister} style={{ color: KS.brand, fontWeight: 800, cursor: 'pointer' }}>Daftar sekarang</a>
      </div>
    </div>
  );
}

// ─── Home (Beranda) ───
function HomeScreen({ onGoto, onFab }) {
  return (
    <div style={screenContainer}>
      {/* Topbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: KS.text, letterSpacing: -0.3 }}>Halo, Danu</div>
          <div style={{ fontSize: 13, color: KS.muted, marginTop: 2 }}>April 2026</div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 18, background: KS.brand,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFF', fontSize: 12, fontWeight: 700,
        }}>DB</div>
      </div>

      <HeroBalance stats={[
        { label: 'Pemasukan', value: '8,00 Jt' },
        { label: 'Pengeluaran', value: '3,75 Jt' },
        { label: 'Tabungan', value: '53%' },
      ]}/>

      <div style={{ display: 'flex', gap: 8 }}>
        <QuickActionCard icon="pencil-simple" label="Manual" onClick={onFab} tone="primary" />
        <QuickActionCard icon="robot" label="AI Chat" tone="accent" />
        <QuickActionCard icon="receipt" label="Struk" tone="success" />
        <QuickActionCard icon="tray-arrow-down" label="Import" tone="info" />
      </div>

      <SectionCard title="Anggaran" action="Lihat →" onActionPress={() => onGoto('budgets')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: KS.text }}>Makan</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: KS.warning, fontVariantNumeric: 'tabular-nums' }}>77%</div>
          </div>
          <div style={{ fontSize: 11, color: KS.muted, fontVariantNumeric: 'tabular-nums' }}>620rb / 800rb</div>
          <ProgressBar value={77} tone="warn" />
          <div style={{ fontSize: 11, color: KS.muted, marginTop: 2 }}>Sisa 180rb · Hampir habis</div>
        </div>
      </SectionCard>

      <SectionCard title="Terakhir" action="Semua →" onActionPress={() => onGoto('transactions')}>
        <TransactionRow icon="storefront" tone="primary" merchant="Indomaret" sublabel="Hari ini · GoPay" amount="-45rb" />
        <TransactionRow icon="coffee" tone="warning" merchant="Fore Coffee" sublabel="Hari ini · GoPay" amount="-38rb" />
        <TransactionRow icon="car" tone="primary" merchant="Grab Car" sublabel="Kemarin · GoPay" amount="-22rb" />
      </SectionCard>

      <div style={{
        background: KS.bgMuted, border: `1px solid ${KS.border}`,
        borderRadius: 16, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <IconBubble name="lightbulb" tone="info" size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: KS.text }}>Insight harian</div>
          <div style={{ fontSize: 12, color: KS.secondary, marginTop: 4, lineHeight: 1.5 }}>
            Pengeluaran kategori <b>Belanja</b> melebihi 10% bulan ini. Mungkin saatnya rem sebentar?
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Transactions ───
function TransactionsScreen({ onFab }) {
  const [filter, setFilter] = React.useState('expense');
  return (
    <div style={screenContainer}>
      <ScreenHeader title="Transaksi" subtitle="Semua catatan terbaru" action="+ Tambah" onActionPress={onFab} />

      <SectionCard title="Filter aktif" action="Reset">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill text="Bulan ini" active onClick={() => {}} />
          <Pill text="Semua wallet" />
          <Pill text="Expense" active={filter === 'expense'} onClick={() => setFilter('expense')} />
          <Pill text="Income" active={filter === 'income'} onClick={() => setFilter('income')} />
        </div>
      </SectionCard>

      <SectionCard title="Daftar transaksi" action="+ Tambah" onActionPress={onFab}>
        <TransactionRow icon="arrow-down-left" tone="success" merchant="Gaji April" sublabel="1 Apr · BCA" amount="+ Rp 8 Jt" positive />
        <TransactionRow icon="storefront" tone="primary" merchant="Indomaret" sublabel="Hari ini · GoPay" amount="-45rb" />
        <TransactionRow icon="coffee" tone="warning" merchant="Fore Coffee" sublabel="Hari ini · GoPay" amount="-38rb" />
        <TransactionRow icon="car" tone="primary" merchant="Grab Car" sublabel="Kemarin · GoPay" amount="-22rb" />
        <TransactionRow icon="shopping-bag" tone="danger" merchant="Tokopedia" sublabel="2 Apr · BCA" amount="-310rb" />
        <TransactionRow icon="bowl-food" tone="warning" merchant="Warteg Bahari" sublabel="2 Apr · Tunai" amount="-25rb" />
        <TransactionRow icon="lightning" tone="info" merchant="PLN Token" sublabel="1 Apr · BCA" amount="-150rb" />
      </SectionCard>
    </div>
  );
}

// ─── Budgets (Anggaran) ───
function BudgetsScreen() {
  const [month, setMonth] = React.useState('Apr');
  return (
    <div style={screenContainer}>
      <ScreenHeader title="Anggaran" subtitle="April 2026" action="+ Tambah" />

      <div style={{
        background: '#FFF', borderRadius: 18, border: `1px solid ${KS.border}`,
        padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: KS.muted }}>Total anggaran</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: KS.text, fontVariantNumeric: 'tabular-nums' }}>Rp 2.200.000</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: KS.bgMuted, borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 10, color: KS.muted }}>Terpakai</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: KS.text, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>1,41 Jt</div>
          </div>
          <div style={{ flex: 1, background: KS.bgMuted, borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 10, color: KS.muted }}>Sisa</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: KS.success, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>790rb</div>
          </div>
          <div style={{ flex: 1, background: KS.bgMuted, borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 10, color: KS.muted }}>Progress</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: KS.text, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>64%</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {['Feb','Mar','Apr','Mei'].map(m => (
          <MonthChip key={m} label={m} active={month === m} onClick={() => setMonth(m)} />
        ))}
      </div>

      <BudgetCard icon="fork-knife"   tone="warning" title="Makan"     meta="620rb / 800rb"  pct="77%"  value={77}  barTone="warn" footer="Sisa 180rb · Hampir habis" />
      <BudgetCard icon="car"          tone="primary" title="Transport" meta="280rb / 400rb"  pct="70%"  value={70}  barTone="ok"   footer="Sisa 120rb · Aman" />
      <BudgetCard icon="shopping-bag" tone="danger"  title="Belanja"   meta="510rb / 500rb"  pct="102%" value={100} barTone="over" footer="Lebih 10rb · Melebihi" />
      <BudgetCard icon="lightning"    tone="info"    title="Tagihan"   meta="0 / 500rb"      pct="0%"   value={0}   barTone="ok"   footer="Belum ada pengeluaran" />
    </div>
  );
}

// ─── Reports (Laporan) ───
function ReportsScreen() {
  return (
    <div style={screenContainer}>
      <ScreenHeader title="Laporan" subtitle="Ringkasan bulan ini" />

      <div style={{ display: 'flex', gap: 10 }}>
        <MetricCard label="Income"  value="Rp 8.000.000" color={KS.success} />
        <MetricCard label="Expense" value="Rp 3.750.000" color={KS.danger} />
      </div>

      <SectionCard title="Tren 6 bulan" action="Detail">
        <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, paddingTop: 16 }}>
          {[
            { h: 72,  c: '#93C5FD', l: 'Nov' },
            { h: 96,  c: '#60A5FA', l: 'Des' },
            { h: 68,  c: '#3B82F6', l: 'Jan' },
            { h: 110, c: '#2563EB', l: 'Feb' },
            { h: 88,  c: '#1D4ED8', l: 'Mar' },
            { h: 102, c: '#4F46E5', l: 'Apr' },
          ].map(b => (
            <div key={b.l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: '100%', height: b.h, background: b.c, borderTopLeftRadius: 10, borderTopRightRadius: 10 }} />
              <div style={{ fontSize: 10, color: KS.muted, fontWeight: 700 }}>{b.l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: KS.muted }}>Perbandingan pengeluaran 6 bulan terakhir.</div>
      </SectionCard>

      <SectionCard title="Kategori tertinggi" action="Lihat semua">
        {[
          { label: 'Makan & Minum',  v: '35%', color: KS.warning },
          { label: 'Belanja',        v: '27%', color: KS.danger },
          { label: 'Transportasi',   v: '18%', color: KS.brand },
          { label: 'Tagihan',        v: '12%', color: KS.info },
          { label: 'Hiburan',        v: '8%',  color: KS.muted },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: KS.text }}>{r.label}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: r.color, fontVariantNumeric: 'tabular-nums' }}>{r.v}</div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ─── Settings (Setelan) ───
function SettingsScreen({ onLogout }) {
  const rows = [
    { icon: 'user', tone: 'primary', label: 'Profil',       helper: 'Nama, foto, mata uang' },
    { icon: 'wallet', tone: 'success', label: 'Dompet',      helper: 'BCA, GoPay, Mandiri, OVO' },
    { icon: 'tag', tone: 'accent', label: 'Kategori',     helper: '8 kategori aktif' },
    { icon: 'bell', tone: 'warning', label: 'Notifikasi',  helper: 'Aktif untuk anggaran' },
    { icon: 'translate', tone: 'info', label: 'Bahasa', helper: 'Indonesia' },
    { icon: 'moon', tone: 'primary', label: 'Tema',        helper: 'Ikuti sistem' },
    { icon: 'question', tone: 'info', label: 'Bantuan',     helper: 'FAQ & kontak' },
  ];
  return (
    <div style={screenContainer}>
      <ScreenHeader title="Setelan" subtitle="Sesuaikan pengalaman aplikasi." />

      <div style={{
        background: '#FFF', borderRadius: 18, border: `1px solid ${KS.border}`,
        padding: 16, display: 'flex', gap: 14, alignItems: 'center',
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: KS.brand, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>DB</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: KS.text }}>Danu Bagaskara</div>
          <div style={{ fontSize: 12, color: KS.muted, marginTop: 2 }}>danu@kaswise.app · Plus</div>
        </div>
        <StatusBadge text="ACTIVE" color={KS.success} />
      </div>

      <div style={{ background: '#FFF', borderRadius: 18, border: `1px solid ${KS.border}`, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 14,
            borderBottom: i < rows.length - 1 ? `1px solid ${KS.border}` : 'none',
          }}>
            <IconBubble name={r.icon} tone={r.tone} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: KS.text }}>{r.label}</div>
              <div style={{ fontSize: 11, color: KS.muted, marginTop: 2 }}>{r.helper}</div>
            </div>
            <PhIcon name="caret-right" weight="bold" size={14} color={KS.muted} />
          </div>
        ))}
      </div>

      <button onClick={onLogout} style={{
        background: 'rgba(239,68,68,0.10)', color: KS.danger,
        border: `1px solid rgba(239,68,68,0.30)`, borderRadius: 999,
        padding: '14px 22px', fontSize: 14, fontWeight: 800,
        fontFamily: ksFont, cursor: 'pointer',
      }}>Keluar dari akun</button>
    </div>
  );
}

// ─── Manual Transaction modal ───
function ManualTransactionScreen({ onClose, onSave }) {
  const [type, setType] = React.useState('expense');
  const [amount, setAmount] = React.useState('45000');
  const [desc, setDesc] = React.useState('Makan siang di warteg');
  const [wallet, setWallet] = React.useState('GoPay');
  const [cat, setCat] = React.useState('Makan');

  const formatAmount = v => {
    const n = Number(String(v).replace(/[^\d]/g, ''));
    return n ? n.toLocaleString('id-ID') : '';
  };

  return (
    <div style={{
      padding: 20, paddingBottom: 40,
      display: 'flex', flexDirection: 'column', gap: 16,
      fontFamily: ksFont, background: KS.bgBase, minHeight: '100%',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: KS.text, letterSpacing: -0.4 }}>Catat manual</div>
          <div style={{ fontSize: 13, color: KS.secondary, marginTop: 2 }}>Input transaksi secara manual tanpa AI.</div>
        </div>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: 17, background: KS.bgMuted, border: `1px solid ${KS.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <PhIcon name="x" weight="bold" size={14} color={KS.text} />
        </button>
      </div>

      {/* Type segmented */}
      <div style={{ display: 'flex', gap: 10 }}>
        {['expense','income'].map(t => {
          const active = type === t;
          const bg = active ? (t === 'income' ? KS.success : KS.danger) : '#FFF';
          return (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, background: bg, border: `1px solid ${active ? bg : KS.border}`,
              color: active ? '#FFF' : KS.text,
              borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 800, fontFamily: ksFont, cursor: 'pointer',
            }}>{t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</button>
          );
        })}
      </div>

      {/* Amount */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: KS.secondary, letterSpacing: 0.6, textTransform: 'uppercase' }}>Nominal</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF', border: `1px solid ${KS.borderStrong}`, borderRadius: 12, padding: '10px 14px' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: KS.secondary }}>Rp</span>
          <input value={formatAmount(amount)} onChange={e => setAmount(e.target.value)} placeholder="0"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 22, fontWeight: 800, color: KS.text, fontFamily: ksFont, fontVariantNumeric: 'tabular-nums' }} />
        </div>
      </div>

      <InputField label="DESKRIPSI" value={desc} onChange={setDesc} placeholder="contoh: Makan siang di warteg" />

      {/* Wallet chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: KS.secondary, letterSpacing: 0.6, textTransform: 'uppercase' }}>Dompet</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['BCA','GoPay','Mandiri','OVO'].map(w => (
            <Pill key={w} text={w} active={wallet === w} onClick={() => setWallet(w)} />
          ))}
        </div>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: KS.secondary, letterSpacing: 0.6, textTransform: 'uppercase' }}>Kategori</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { name: 'Makan',     icon: 'fork-knife' },
            { name: 'Transport', icon: 'car' },
            { name: 'Belanja',   icon: 'shopping-bag' },
            { name: 'Tagihan',   icon: 'lightning' },
            { name: 'Hiburan',   icon: 'game-controller' },
          ].map(c => {
            const active = cat === c.name;
            return (
              <button key={c.name} onClick={() => setCat(c.name)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: active ? KS.brand : '#FFF',
                color: active ? '#FFF' : KS.secondary,
                border: `1px solid ${active ? KS.brand : KS.border}`,
                borderRadius: 999, padding: '6px 12px 6px 6px',
                fontSize: 12, fontWeight: 700, fontFamily: ksFont, cursor: 'pointer',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 11,
                  background: active ? 'rgba(255,255,255,0.18)' : '#EEF2FF',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PhIcon name={c.icon} weight="bold" size={12} color={active ? '#FFF' : KS.brand} />
                </span>
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <PrimaryButton label="Simpan transaksi" onPress={onSave} />
    </div>
  );
}

// AI draft toast — appears after FAB save
function AIToast({ visible }) {
  return (
    <div style={{
      position: 'absolute', bottom: 100, left: 16, right: 16,
      background: '#0C1A3A', color: '#FFF', borderRadius: 16,
      padding: 14, display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
      pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 220ms ease, transform 220ms ease',
      fontFamily: ksFont, zIndex: 30,
    }}>
      <IconBubble name="check" tone="success" size={32} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>Transaksi tersimpan</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Confidence 0.92 · Batalkan dalam 5d</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color: KS.accent }}>BATALKAN</span>
    </div>
  );
}

Object.assign(window, {
  SplashScreen, LoginScreen,
  HomeScreen, TransactionsScreen, BudgetsScreen, ReportsScreen, SettingsScreen,
  ManualTransactionScreen, AIToast,
});
