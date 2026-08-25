import React, { useEffect, useState } from 'react'

export default function Hero({ loggedUser = null, onLoginClick }) {
  const [onlineCount, setOnlineCount] = useState(0)

  const joinServerUrl = 'https://cfx.re/join/dg3r3zd'
  const isLoggedIn = Boolean(loggedUser)

  useEffect(() => {
    let active = true

    const loadOnlineCount = async () => {
      try {
        const response = await fetch('/api/server-status', { cache: 'no-store' })
        if (!response.ok) throw new Error('server status unavailable')

        const data = await response.json()
        const playersPayload = data?.players ?? data?.Data?.players ?? data?.data?.players ?? []
        const nextCount = Array.isArray(playersPayload) ? playersPayload.length : Number(playersPayload || 0)

        if (active) {
          setOnlineCount(Number.isFinite(nextCount) ? nextCount : 0)
        }
      } catch {
        if (active) {
          setOnlineCount(0)
        }
      }
    }

    loadOnlineCount()
    const timer = window.setInterval(loadOnlineCount, 30000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  return (
    <section className="hero-shell">
      <video
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      >
        <source src="/img/ds.mp4" type="video/mp4" />
      </video>

      <div className="hero-overlay" aria-hidden="true" />

      <div className="hero-content">
        <div className="hero-badges" aria-label="Detroit State live player count">
          <span className="hero-chip hero-chip--live">
            <span className="hero-live-text">متصل</span>
            <span className="hero-live-count">{onlineCount}</span>
            <span className="hero-live-dot" aria-hidden="true" />
          </span>
          <span className="hero-chip hero-chip--primary">Season 1</span>
        </div>

        <h1 className="hero-title">
          DETROIT STATE
        </h1>

        <p className="hero-subtitle">
          حياكم الله في سيرفر ديترويت ستيت المتخصص في الرول بلاي، نحاول جاهدين تقديم أفضل تجربة للرول بلاي في شمال افريقيا. انضم إلينا الآن وعِش حياتك كما تريد.
        </p>

        <div className="hero-actions">
          {isLoggedIn ? (
            <a className="btn btn-primary" href={joinServerUrl} target="_blank" rel="noreferrer">
              ابدأ رحلتك
            </a>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onLoginClick || (() => window.location.href = '/auth/discord')}>
              تسجيل الدخول
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
