import React, { useEffect, useState } from 'react'
import { FaDiscord } from 'react-icons/fa6'

export default function Jobs() {
  const [discordMembers, setDiscordMembers] = useState('0')

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

  return (
    <section id="jobs" className="section-block promo-section">
      <div className="promo-box">
        <span className="promo-badge">
          <span className="promo-dot" />
          THE ROYAL
        </span>

        <h2 className="promo-title">مكانك محفوظ بيننا</h2>

        <p className="promo-description">
          انضم الآن لأكبر مجتمع عربي في فايف إم. فعاليات يومية، مسابقات، وصداقات تدوم.
        </p>

        <div className="promo-numbers">
          <div className="promo-stat promo-stat-left">
            <span className="promo-stat-label">أعضاء الديسكورد</span>
            <strong>{discordMembers}</strong>
            <span className="promo-stat-tag">DISCORD MEMBERS</span>
          </div>

          <div className="promo-stat promo-stat-right">
            <span className="promo-stat-label promo-live-label">
              <span className="promo-live-dot" aria-hidden="true" />
              متصل الآن
            </span>
            <strong>0</strong>
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
