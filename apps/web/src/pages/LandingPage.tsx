import { useLandingCopy } from '../lib/landing-i18n'
import LanguageToggle from '@components/i18n/LanguageToggle'
import ThemeToggle from '@components/theme/ThemeToggle'

const appUrl = import.meta.env.VITE_KASWISE_APP_URL?.trim() || 'https://kaswise.com'
const supportEmail = 'kaswise.id@gmail.com'
const supportMailto = `mailto:${supportEmail}`

export default function LandingPage() {
  const t = useLandingCopy()

  return (
    <main className="landing-page" data-testid="web-landing-page">
      <header className="landing-header" aria-label="Navigasi Kaswise">
        <a className="landing-brand" href="#top" aria-label="Kaswise">
          <span className="landing-logo-shell" aria-hidden="true">
            <img src="/brand/logo-kaswise-mark.svg" alt="" />
          </span>
          <span>
            <strong>kaswise</strong>
            <small>{t.brandTagline}</small>
          </span>
        </a>

        <nav className="landing-nav" aria-label="Navigasi landing">
          <a href="#top">{t.nav.product}</a>
          <a href="#masalah">{t.nav.masalah}</a>
          <a href="#sistem">{t.nav.sistem}</a>
          <a href="#periode">{t.nav.periode}</a>
          <a href="#fitur">{t.nav.fitur}</a>
          <a href="#faq">{t.nav.faq}</a>
        </nav>

        <div className="landing-header-actions">
          <ThemeToggle className="landing-theme-toggle" />
          <LanguageToggle className="landing-language-toggle" />
          <a className="landing-nav-cta" href={appUrl}>{t.ctaApp}</a>
        </div>
      </header>

      <section id="top" className="landing-hero landing-hero--ledger-grid" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">{t.hero.eyebrow}</span>
          <h1 id="landing-title">{t.hero.title}</h1>
          <p>{t.hero.body}</p>

          <div className="landing-actions" aria-label="Aksi utama">
            <a className="landing-primary" href={appUrl}>{t.hero.primary}</a>
            <a className="landing-secondary" href="#sistem">{t.hero.secondary}</a>
          </div>

          <div className="landing-proof-strip" aria-label="Ringkasan produk">
            {t.hero.chips.map((chip) => (<span key={chip}>{chip}</span>))}
          </div>

          <nav className="landing-quick-menu" aria-label="Pilih bagian landing page">
            {t.quickMenus.map((item) => (
              <a href={`#${item.label === t.quickMenus[0].label ? 'masalah' : item.label === t.quickMenus[1].label ? 'sistem' : item.label === t.quickMenus[2].label ? 'periode' : 'faq'}`} key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.body}</span>
              </a>
            ))}
          </nav>

          <div className="landing-stat-grid" aria-label="Ringkasan kemampuan Kaswise">
            {t.heroStats.map((item) => (
              <div className="landing-stat-card" key={item.value}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-device-wrap" aria-label="Preview antarmuka Kaswise">
          <div className="landing-device">
            <div className="landing-device-status" aria-hidden="true">
              <span>09:41</span>
              <span>{t.mockup.status}</span>
            </div>

            <div className="landing-app-header">
              <div>
                <span>{t.mockup.periodLabel}</span>
                <strong>{t.mockup.periodValue}</strong>
              </div>
              <span className="landing-profile-avatar" aria-hidden="true">RP</span>
            </div>

            <div className="landing-balance-card">
              <span className="landing-card-label">{t.mockup.cashflowLabel}</span>
              <strong>Rp3.420.000</strong>
              <p>{t.mockup.cashflowHint}</p>
            </div>

            <div className="landing-review-card">
              <div className="landing-review-head">
                <span>{t.mockup.inputLabel}</span>
                <strong>{t.mockup.inputStatus}</strong>
              </div>
              <div className="landing-capture-card compact">
                <p>beli kopi 35rb di Kopi Kenangan</p>
              </div>
              <div className="landing-chip-row" aria-label="Hasil pembacaan transaksi">
                <span>Rp35.000</span>
                <span>Makan & Minum</span>
                <span>Hari ini</span>
              </div>
            </div>

            <div className="landing-budget-card">
              <div className="landing-budget-copy">
                <span>{t.mockup.totalSaldoLabel}</span>
                <strong>Rp12.840.000</strong>
              </div>
              <div className="landing-progress" aria-label="Budget makan tersisa 72 persen">
                <span />
              </div>
            </div>

            <div className="landing-tabbar" aria-hidden="true">
              {t.mockup.tabs.map((tab, i) => (
                <span key={tab} className={i === 0 ? 'active' : ''}>{tab}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="masalah" className="landing-section landing-problem-section" aria-labelledby="problem-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">{t.problem.kicker}</p>
          <h2 id="problem-title">{t.problem.title}</h2>
        </div>

        <div className="landing-problem-grid">
          {t.problem.items.map((item) => (
            <article className="landing-problem-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="sistem" className="landing-section landing-flow-section" aria-labelledby="flow-title">
        <div className="landing-section-heading">
          <p className="landing-section-kicker">{t.system.kicker}</p>
          <h2 id="flow-title">{t.system.title}</h2>
        </div>

        <div className="landing-flow-list">
          {t.system.steps.map((step, index) => (
            <article className="landing-flow-item" key={step.title}>
              <span className="landing-step-number">0{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="periode" className="landing-section landing-period" aria-labelledby="period-title">
        <div>
          <span className="landing-eyebrow">{t.period.eyebrow}</span>
          <h2 id="period-title">{t.period.title}</h2>
          <p>{t.period.body}</p>
        </div>
        <ul className="landing-period-list">
          {t.period.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="harga" className="landing-section landing-pricing-section" aria-labelledby="pricing-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">{t.pricing.kicker}</p>
          <h2 id="pricing-title">{t.pricing.title}</h2>
        </div>

        <div className="landing-pricing-grid">
          <article className="landing-pricing-card">
            <div className="landing-pricing-header">
              <strong>{t.pricing.free.name}</strong>
              <span className="landing-pricing-amount">{t.pricing.free.price}</span>
              <small>{t.pricing.free.period}</small>
            </div>
            <div className="landing-pricing-table">
              {t.pricing.free.features.map((item, i) => {
                const prem = t.pricing.premium.features[i]
                return (
                  <div className="landing-pricing-row" key={item.f}>
                    <span className="landing-pricing-feat-label">{item.f}</span>
                    <span className="landing-pricing-feat-free">{item.v}</span>
                    <span className="landing-pricing-feat-premium">{prem?.v ?? ''}</span>
                  </div>
                )
              })}
            </div>
          </article>

          <article className="landing-pricing-card landing-pricing-premium">
            <div className="landing-pricing-header">
              <strong>{t.pricing.premium.name}</strong>
              {t.pricing.premium.badge ? (
                <span className="landing-pricing-badge">{t.pricing.premium.badge}</span>
              ) : null}
              <span className="landing-pricing-amount">{t.pricing.premium.priceMonthly}</span>
              <small>{t.pricing.premium.periodMonthly}</small>
              <span className="landing-pricing-yearly">{t.pricing.premium.priceYearly}{t.pricing.premium.periodYearly}</span>
            </div>
            <div className="landing-pricing-alltiers">
              <p>{t.pricing.allTiers}</p>
            </div>
          </article>
        </div>

        <div className="landing-pricing-cta">
          <a className="landing-primary" href={appUrl}>{t.pricing.cta}</a>
        </div>
      </section>

      <section id="fitur" className="landing-section landing-highlight-section" aria-labelledby="feature-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">{t.features.kicker}</p>
          <h2 id="feature-title">{t.features.title}</h2>
        </div>

        <div className="landing-highlight-grid landing-highlight-grid-large">
          {t.features.items.map((item) => (
            <article className="landing-highlight-card" key={item.title}>
              <span className={`landing-icon-bubble landing-icon-bubble-${item.tone}`}>{item.label.slice(0, 2)}</span>
              <div>
                <span className="landing-card-label">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-preview-section" aria-labelledby="preview-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">{t.preview.kicker}</p>
          <h2 id="preview-title">{t.preview.title}</h2>
        </div>

        <div className="landing-preview-grid">
          {t.preview.panels.map((panel) => (
            <article className="landing-preview-card" key={panel.title}>
              <div className="landing-preview-window">
                <span>{panel.title}</span>
                <strong>{panel.value}</strong>
                <small>{panel.label}</small>
              </div>
              <h3>{panel.title}</h3>
              <p>{panel.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="keamanan" className="landing-section landing-trust" aria-labelledby="trust-title">
        <div className="landing-trust-copy">
          <span className="landing-eyebrow">{t.security.eyebrow}</span>
          <h2 id="trust-title">{t.security.title}</h2>
          <p>{t.security.body}</p>
        </div>

        <ul className="landing-trust-list">
          {t.security.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="faq" className="landing-section landing-faq" aria-labelledby="faq-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">{t.faq.kicker}</p>
          <h2 id="faq-title">{t.faq.title}</h2>
        </div>

        <div className="landing-faq-list">
          {t.faq.items.map((item) => (
            <details className="landing-faq-item" key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="bantuan" className="landing-section landing-help" aria-labelledby="help-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">{t.help.kicker}</p>
          <h2 id="help-title">{t.help.title}</h2>
        </div>

        <div className="landing-help-grid">
          {t.help.cards.map((card) => (
            <article className="landing-help-card" key={card.label}>
              <span className="landing-card-label">{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <a href={card.label === t.help.cards[0].label ? '/help' : card.label === t.help.cards[1].label ? '/terms' : '/privacy'}>{card.link}</a>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final-cta" aria-label="Mulai menggunakan Kaswise">
        <span className="landing-logo-shell landing-logo-shell-large" aria-hidden="true">
          <img src="/brand/logo-kaswise-mark.svg" alt="" />
        </span>
        <h2>{t.finalCta.title}</h2>
        <p>{t.finalCta.body}</p>
        <a className="landing-primary" href={appUrl}>{t.finalCta.button}</a>
      </section>

      <footer className="landing-footer landing-footer-rich">
        <div className="landing-footer-brand">
          <strong>Kaswise</strong>
          <span>{t.footer.brand}</span>
          <small>© 2026 Kaswise. All rights reserved.</small>
        </div>
        <nav className="landing-footer-column" aria-label="Menu produk">
          <strong>{t.footer.produk}</strong>
          <a href="#sistem">{t.footer.caraKerja}</a>
          <a href="#fitur">{t.footer.fitur}</a>
          <a href="#periode">{t.footer.laporanPeriode}</a>
          <a href="#keamanan">{t.footer.keamanan}</a>
        </nav>
        <nav className="landing-footer-column" aria-label="Menu informasi">
          <strong>{t.footer.informasi}</strong>
          <a href="/help">{t.footer.bantuan}</a>
          <a href="/terms">{t.footer.syarat}</a>
          <a href="/privacy">{t.footer.privasi}</a>
          <a href="/contact">{t.footer.kontak}</a>
        </nav>
        <div className="landing-footer-column">
          <strong>{t.footer.hubungi}</strong>
          <a href={supportMailto}>{supportEmail}</a>
          <span>{t.footer.supportHint}</span>
        </div>
      </footer>
    </main>
  )
}
