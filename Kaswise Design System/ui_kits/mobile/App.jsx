// Kaswise mobile UI kit — click-thru app shell
// Owns route state: splash / login / app (with tabs) / manual modal

function KaswiseApp() {
  const [stage, setStage] = React.useState('splash'); // splash | login | app
  const [tab, setTab] = React.useState('home');
  const [manualOpen, setManualOpen] = React.useState(false);
  const [toast, setToast] = React.useState(false);

  const fireToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2800);
  };

  // ── Stages: Splash & Login (full-bleed, no tab bar)
  if (stage === 'splash') {
    return <SplashScreen onPrimary={() => setStage('login')} onSecondary={() => setStage('login')} />;
  }
  if (stage === 'login') {
    return <LoginScreen
      onLogin={() => setStage('app')}
      onBack={() => setStage('splash')}
      onRegister={() => setStage('app')}
    />;
  }

  // ── App stage — tabs + FAB + manual modal
  let body = null;
  if (tab === 'home')         body = <HomeScreen        onGoto={setTab} onFab={() => setManualOpen(true)} />;
  if (tab === 'transactions') body = <TransactionsScreen onFab={() => setManualOpen(true)} />;
  if (tab === 'budgets')      body = <BudgetsScreen />;
  if (tab === 'reports')      body = <ReportsScreen />;
  if (tab === 'settings')     body = <SettingsScreen onLogout={() => setStage('splash')} />;

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      {body}

      {/* Manual transaction over-sheet */}
      {manualOpen && (
        <div style={{
          position: 'absolute', inset: 0, background: KS.bgBase, zIndex: 20, overflow: 'auto',
        }}>
          <ManualTransactionScreen
            onClose={() => setManualOpen(false)}
            onSave={() => { setManualOpen(false); fireToast(); }}
          />
        </div>
      )}

      <AIToast visible={toast} />

      <BottomTabs
        active={tab}
        onChange={(next) => { setManualOpen(false); setTab(next); }}
        onFab={() => setManualOpen(true)}
      />
    </div>
  );
}

Object.assign(window, { KaswiseApp });
