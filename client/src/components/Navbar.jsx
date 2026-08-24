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
    <header className="site-header">
      <button type="button" className="nav-left home-brand" onClick={() => onPageSelect ? onPageSelect('home') : null} aria-label="العودة للرئيسية">
        <span className="brand-mark" aria-label="logo">
          <img src="/img/DS.webp" alt="DS logo" />
        </span>
        <span className="brand-copy">
          <span className="brand-name">{settings.siteName || 'DETROIT STATE'}</span>
          <span className="brand-tag">{settings.title || 'Royal Community'}</span>
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
    </header>
  )
}
