import React from 'react'

export default function Streamers({ creators = [], pageMode = false }) {
  const visibleCreators = [...creators]
    .filter((creator) => creator.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  if (!visibleCreators.length) return null

  if (pageMode) {
    return (
      <section id="creators" className="rules-page-shell">
        <div className="rules-page-inner">
          <header className="rules-page-header">
            <div
              className="rules-page-hero"
              style={{
                backgroundImage: "linear-gradient(90deg, rgba(10, 6, 18, 0.8), rgba(10, 6, 18, 0.36)), url('/img/banner.png')"
              }}
            />

            <div className="rules-page-hero-content">
              <span className="rules-page-eyebrow">شركاء النجاح</span>
              <h1>صناع المحتوى</h1>
              <p>نخبة من صناع المحتوى في مدينة ديترويت.</p>
            </div>
          </header>

          <div className="creators-page-layout">
            <main className="rules-page-content">
              <section className="rules-page-panel creators-panel">
                <div className="streamers-grid creator-grid">
              {visibleCreators.map(({ name, platform, followers, image, url, id }, index) => {
                const initials = (name || 'DS')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() || '')
                  .join('') || 'DS'

                const avatarStyle = image
                  ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: 'linear-gradient(135deg, #2f1f47 0%, #0f172a 100%)' }

                const safeUrl = url && !/^https?:\/\//i.test(url) ? `https://${url}` : url

                const Avatar = (
                  <div className="creator-avatar" style={avatarStyle}>
                    {!image && <span>{initials}</span>}
                  </div>
                )

                return (
                  <div className="streamer-card creator-card purple" key={id || name + index}>
                    {safeUrl ? <a href={safeUrl} target="_blank" rel="noreferrer" className="creator-link">{Avatar}</a> : Avatar}
                    <div className="streamer-meta">
                      {safeUrl ? <a href={safeUrl} target="_blank" rel="noreferrer" className="creator-link"><strong>{name}</strong></a> : <strong>{name}</strong>}
                      <span>{platform}</span>
                      <small>{followers}</small>
                    </div>
                  </div>
                )
              })}
                </div>
              </section>
            </main>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="streamers" className="section-block streamers-section">
      <div className="section-header center-header small-header">
        <span className="eyebrow">شركاء النجاح</span>
        <h2>صناع المحتوى</h2>
        <p>نخبة من صناع المحتوى في مدينة ديترويت.</p>
      </div>

      <div className="streamers-grid creator-grid">
        {visibleCreators.map(({ name, platform, followers, image, url, id }, index) => {
          const initials = (name || 'DS')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('') || 'DS'

          const avatarStyle = image
            ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: 'linear-gradient(135deg, #2f1f47 0%, #0f172a 100%)' }

          // ensure URL has protocol when rendering as a safety net
          const safeUrl = url && !/^https?:\/\//i.test(url) ? `https://${url}` : url

          const Avatar = (
            <div className="creator-avatar" style={avatarStyle}>
              {!image && <span>{initials}</span>}
            </div>
          )

          return (
            <div className="streamer-card creator-card purple" key={id || name + index}>
              {safeUrl ? <a href={safeUrl} target="_blank" rel="noreferrer" className="creator-link">{Avatar}</a> : Avatar}
              <div className="streamer-meta">
                {safeUrl ? <a href={safeUrl} target="_blank" rel="noreferrer" className="creator-link"><strong>{name}</strong></a> : <strong>{name}</strong>}
                <span>{platform}</span>
                <small>{followers}</small>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
