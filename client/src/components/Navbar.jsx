import React, { useEffect, useState } from 'react'
import { FaDiscord, FaUserShield } from 'react-icons/fa6'

const normalizeAdminRole = (role) => {
  const value = (role || '').toString().trim().toLowerCase()
  if (!value) return 'member'
  if (['owner', 'اونر'].includes(value)) return 'owner'
  if (['admin', 'administrator', 'ادمن'].includes(value)) return 'admin'
  if (['mod', 'moderator', 'مود', 'مدير'].includes(value)) return 'mod'
  return 'member'
}

export default function Navbar({
  onLoginClick,
  pages = [],
  settings = {},
  currentPage = 'home',
  onPageSelect,
  loggedUser = null,
  accountMenuOpen = false,
  onAccountMenuToggle,
  onAccountOpen,
  onLogout,
  onAdminClick,
  userRole = null
}) {
  const [discordCount, setDiscordCount] = useState('961')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Prevent body scroll when mobile menu is open
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const res = await fetch('/api/discord-count')
        if (!res.ok) throw new Error('count failed')
        const data = await res.json()
        const value = data.count || data.approximate_member_count || data.approximate_presence_count || 961
        if (mounted) setDiscordCount(value)
      } catch {
        if (mounted) setDiscordCount('961')
      }
    }

    load()
    const timer = setInterval(load, 60000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  const navItems = [{ id: 'home', name: 'الرئيسية' }, ...pages.filter((page) => page.id !== 'home').slice().sort((a, b) => (a.order || 0) - (b.order || 0))]

  const avatarUrl = loggedUser?.avatar && loggedUser.avatar.startsWith('http')
    ? loggedUser.avatar
    : loggedUser?.avatar
      ? `https://cdn.discordapp.com/avatars/${loggedUser.id}/${loggedUser.avatar}.png`
      : '/img/DS.webp'

  const effectiveRole = userRole || loggedUser?.role || 'member'
  const canAccessAdmin = ['owner', 'admin', 'mod'].includes(normalizeAdminRole(effectiveRole))

  return (
    <>
      <header className="site-header">
        <button type="button" className="nav-left home-brand" onClick={() => onPageSelect ? onPageSelect('home') : null} aria-label="العودة للرئيسية">
          <span className="brand-mark" aria-label="logo">
            <img src="/img/DS.webp" alt="DS logo" />
          </span>
          <span className="brand-copy">
            <span className="brand-name">{settings.siteName || 'DETROIT STATE'}</span>
            <span className="brand-tag">{settings.title || 'RP Community'}</span>
          </span>
        </button>

        <nav className="nav-center" aria-label="Main navigation">
          {navItems.map((page) => (
            page.externalUrl ? (
              <a key={page.id} href={page.externalUrl} target="_blank" rel="noreferrer" className="nav-btn">{page.name}</a>
            ) : (
              <button
                key={page.id}
                type="button"
                className={currentPage === page.id ? 'nav-btn active' : 'nav-btn'}
                onClick={() => onPageSelect ? onPageSelect(page.id) : null}
              >
                {page.name}
              </button>
            )
          ))}
        </nav>

        <div className="nav-right">
          <a href={settings.discordLink || 'https://discord.gg/DSRP'} target="_blank" rel="noreferrer" className="discord-pill" aria-label="Discord">
            <FaDiscord className="discord-svg" />
          </a>

          {canAccessAdmin && onAdminClick && (
            <button type="button" className="admin-pill" onClick={onAdminClick} aria-label="Open admin panel">
              <FaUserShield className="admin-icon" />
              <span>لوحة الإدارة</span>
            </button>
          )}

          {loggedUser ? (
            <div className="account-menu-wrap">
              <button type="button" className="account-trigger" onClick={onAccountMenuToggle} aria-label="Open account menu">
                <img src={avatarUrl} alt={loggedUser.name || 'Account'} className="account-avatar" />
                <span className="account-name">{loggedUser.name || 'حساب'}</span>
              </button>

              {accountMenuOpen && (
                <div className="account-dropdown">
                  <button type="button" className="account-menu-item" onClick={onAccountOpen}>حسابي</button>
                  <button type="button" className="account-menu-item danger" onClick={onLogout}>تسجيل الخروج</button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="login-pill" onClick={onLoginClick}>تسجيل الدخول</button>
          )}
        </div>

        <div className="mobile-header-shell">
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label="فتح القائمة"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            ☰
          </button>

          <button type="button" className="mobile-brand-button" onClick={() => onPageSelect ? onPageSelect('home') : null} aria-label="العودة للرئيسية">
            <span className="mobile-brand-mark" aria-label="logo">
              <img src="/img/DS.webp" alt="DS logo" />
            </span>
            <span className="mobile-brand-copy">
              <span className="mobile-brand-name">{settings.siteName || 'DETROIT STATE'}</span>
            </span>
          </button>

          {loggedUser ? (
            <div className="mobile-account-wrap">
              <button type="button" className="mobile-account-button" onClick={onAccountMenuToggle} aria-label="فتح قائمة الحساب">
                <img src={avatarUrl} alt={loggedUser.name || 'Account'} className="mobile-account-avatar" />
                <span className="mobile-account-name">{loggedUser.name || 'حساب'}</span>
              </button>

              {accountMenuOpen && (
                <div className="mobile-account-dropdown">
                  <button type="button" className="mobile-account-item" onClick={onAccountOpen}>حسابي</button>
                  <button type="button" className="mobile-account-item danger" onClick={onLogout}>تسجيل الخروج</button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="mobile-login-button" onClick={onLoginClick}>
              تسجيل الدخول
            </button>
          )}
        </div>
      </header>

      <aside className={`mobile-side-menu ${mobileMenuOpen ? 'open' : ''}`} aria-label="قائمة الصفحات">
        <div className="mobile-side-header">
          <span>القائمة</span>
          <button type="button" className="mobile-close-button" onClick={() => setMobileMenuOpen(false)} aria-label="إغلاق القائمة">×</button>
        </div>

        {navItems.map((page) => (
          page.externalUrl ? (
            <a
              key={page.id}
              href={page.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="mobile-side-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              {page.name}
            </a>
          ) : (
            <button
              key={page.id}
              type="button"
              className={currentPage === page.id ? 'mobile-side-item active' : 'mobile-side-item'}
              onClick={() => {
                setMobileMenuOpen(false)
                if (onPageSelect) onPageSelect(page.id)
              }}
            >
              {page.name}
            </button>
          )
        ))}

        {canAccessAdmin && onAdminClick && (
          <button type="button" className="mobile-side-item admin" onClick={() => { setMobileMenuOpen(false); onAdminClick() }}>
            لوحة الإدارة
          </button>
        )}
      </aside>

      {mobileMenuOpen && <button type="button" className="mobile-menu-backdrop" aria-label="إغلاق القائمة" onClick={() => setMobileMenuOpen(false)} />} 
    </>
  )
}
