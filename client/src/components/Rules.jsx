import React from 'react'
import { FaCoins } from 'react-icons/fa'

const items = [
  {
    title: 'حماية قصوى',
    tag: 'ANTIGRAVITY SHIELD',
    text: 'نظام حماية خاص ومطور يضمن بيئة لعب نظيفة.',
    accent: 'gov'
  },
  {
    title: 'أداء مستقر',
    tag: 'ULTRA PERFORMANCE',
    text: 'خوادم قوية تضمن عدم وجود تقطيع في اللعب.',
    accent: 'gang'
  },
  {
    title: 'اقتصاد متوازن',
    tag: 'BALANCED ECONOMY',
    text: 'نظام مالي واقعي ومدروس يعطي قيمة لجهدك.',
    accent: 'citizen'
  }
]

export default function Rules() {
  return (
    <section id="rules" className="section-block stats-section">
      <div className="section-header center-header small-header">
        <span className="eyebrow">النظام يعمل</span>
        <h2>مميزات النظام</h2>
        <p>تقنيات متطورة تضمن لك أفضل تجربة واقعية.</p>
      </div>

      <div className="feature-list system-list">
        {items.map((item, idx) => (
          <div key={item.title} className={`feature-line system-card ${item.accent}`}>
            <div className="feature-copy">
              <div className="feature-line-top">
                <strong>{item.title}</strong>
                <span>{item.tag}</span>
              </div>
              <span>{item.text}</span>
            </div>

            <div className="feature-center" aria-hidden>
              <div className="feature-bars">
                <span className="bar" style={{height: '22px'}} />
                <span className="bar" style={{height: '40px'}} />
                <span className="bar" style={{height: '30px'}} />
                <span className="bar" style={{height: '52px'}} />
                <span className="bar" style={{height: '36px'}} />
              </div>
            </div>

            <div className="system-badge" aria-hidden>
              <div className="badge-icon">
                {item.accent === 'gov' ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l7 3v6c0 5-3.6 9.7-7 11-3.4-1.3-7-6-7-11V5l7-3z" stroke="currentColor" strokeWidth="1" fill="rgba(255,255,255,0.02)"/>
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : item.accent === 'gang' ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" stroke="currentColor" strokeWidth="1" fill="rgba(255,255,255,0.02)"/>
                  </svg>
                ) : (
                  <FaCoins className="badge-svg" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
