import React from 'react'

export default function LoginPage({ onClose, onLogin }) {
  const submit = () => {
    window.location.href = '/auth/discord'
  }

  const welcomeText = 'WELCOME BACK'
  const welcomeLetters = welcomeText.split('').map((char, index) => ({
    char,
    tone: index % 2 === 0 ? 'purple' : 'white'
  }))

  return (
    <div className="login-page" onClick={onClose}>
      <div className="login-shell" onClick={(event) => event.stopPropagation()}>
        <div className="login-panel">
          <button type="button" className="login-close" onClick={onClose} aria-label="إغلاق" />

          <div className="login-logo-top">
            <img src="/img/DS.webp" alt="DS logo" />
          </div>

          <div className="login-copy">
            <span className="mini-brand">DETROIT STATE</span>
            <h2>
              {welcomeLetters.map(({ char, tone }, index) => (
                <span key={`${char}-${index}`} className={`welcome-letter ${tone}`}>
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </h2>
          </div>

          <h1>تسجيل الدخول</h1>

          <div className="discord-login-box">
            <p>للدخول إلى الموقع، يجب أن تكون عضواً في سيرفر Discord الخاص بنا.</p>
            <button className="btn btn-primary full-width" type="button" onClick={submit}>تسجيل الدخول عبر الديسكورد</button>
          </div>

          <div className="login-footer">
            <a href="https://discord.gg/DSRP" target="_blank" rel="noreferrer">انضم الآن</a>
          </div>
        </div>

        <div className="login-visual">
          <div className="login-visual-overlay" />
        </div>
      </div>
    </div>
  )
}
