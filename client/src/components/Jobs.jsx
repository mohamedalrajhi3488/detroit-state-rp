import React, { useEffect, useState } from 'react'
import { FaDiscord } from 'react-icons/fa6'

export default function Jobs() {
  const [discordMembers, setDiscordMembers] = useState('0')
  const [serverStatus, setServerStatus] = useState('restarting')
  const [onlinePlayers, setOnlinePlayers] = useState(0)

  useEffect(() => {
    let mounted = true

    const loadMembers = async () => {
      try {
        const response = await fetch('/api/discord-count', { cache: 'no-store' })
        if (!response.ok) throw new Error('count failed')
        const data = await response.json()
        const value = Number(data?.count || 0)

        if (mounted) {
          setDiscordMembers(Number.isFinite(value) ? value.toLocaleString('en-US') : '0')
        }
      } catch {
        if (mounted) setDiscordMembers('0')
      }
    }

    loadMembers()
    const timer = setInterval(loadMembers, 60000)

    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const loadServerStatus = async () => {
      try {
        const response = await fetch('/api/server-status', { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (mounted) setServerStatus(response.status === 404 ? 'offline' : 'restarting')
          return
        }

        const count = Number(data?.clients ?? (Array.isArray(data?.players) ? data.players.length : 0))
        if (mounted) {
          setOnlinePlayers(Number.isFinite(count) ? count : 0)
          setServerStatus(data?.status === 'online' ? 'online' : 'restarting')
        }
      } catch {
        if (mounted) setServerStatus('restarting')
      }
    }

    loadServerStatus()
    const timer = setInterval(loadServerStatus, 30000)

    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  const serverStatusLabel = {
    online: 'متصل الآن',
    offline: 'غير متصل',
    restarting: 'إعادة التشغيل'
  }[serverStatus]

  return (
    <section id="jobs" className="section-block promo-section">
      <div className="promo-box">
        <span className="promo-badge">
          <span className="promo-dot" />
          Detroit RP
        </span>

        <h2 className="promo-title"> اكتسب قصتك ، اصنع أثرك</h2>

        <p className="promo-description">
          في مدينة ديترويت، كل قرار له تأثير، وكل شخصية لها طريقها , ابدأ من الصفر، كوّن علاقاتك، واصنع اسمك ومكانك داخل المدينة.
        </p>

        <div className="promo-numbers">
          <div className="promo-stat promo-stat-left">
            <span className="promo-stat-label">أعضاء الديسكورد</span>
            <strong>{discordMembers}</strong>
            <span className="promo-stat-tag">DISCORD MEMBERS</span>
          </div>

          <div className="promo-stat promo-stat-right">
            <span className="promo-stat-label promo-live-label">
              <span className={`promo-live-dot is-${serverStatus}`} aria-hidden="true" />
              {serverStatusLabel}
            </span>
            <strong>{serverStatus === 'online' ? onlinePlayers : '—'}</strong>
            <span className="promo-stat-tag">LIVE SESSION</span>
          </div>
        </div>

        <a className="btn btn-primary promo-btn" href="https://discord.gg/DSRP" target="_blank" rel="noreferrer">
          <FaDiscord className="promo-btn-icon" />
          انضم للعائلة الآن
        </a>
      </div>
    </section>
  )
}
