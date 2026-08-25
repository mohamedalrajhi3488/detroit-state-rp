import React from 'react'

export default function Hero() {
  return (
    <section className="hero-shell">
      <div className="hero-background" aria-hidden="true" />

      <div className="hero-content">
        <div className="hero-topline">
          <span className="hero-badge">Season 1</span>
          <span className="live-dot">0 متصل</span>
        </div>

        <h1 className="hero-title">
          <span className="hero-word">DETROIT STATE</span>
          <span className="hero-word ghost">DETROIT STATE</span>
        </h1>
        <div className="hero-season">S E A S O N 1</div>

        <p className="hero-subtitle">
          انضم إلى آفاق جديدة من الواقعية. المجتمع الأرقى لصناع القصص والأساطير.
        </p>

        <div className="hero-actions">
          <a className="btn btn-primary" href="fivem://connect/dg3r3zd">
            ابدأ رحلتك
          </a>
          <a className="btn btn-secondary" href="https://discord.gg/DSRP" target="_blank" rel="noreferrer">
            ديسكورد
          </a>
        </div>
      </div>

      <span className="scroll-cue" aria-hidden="true">
        <span className="scroll-cue-arrow" />
      </span>
    </section>
  )
}
