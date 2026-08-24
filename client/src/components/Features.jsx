import React, { useState } from 'react'

const cards = [
  {
    status: 'ACTIVE',
    state: 'Duty: 24/7',
    title: 'الجهات الحكومية',
    text: 'انضم لسلك الشرطة أو الإسعاف وكن جزءاً من نظام المدينة.',
    accent: 'gov'
  },
  {
    status: 'RESTRICTED',
    state: 'Priority: High',
    title: 'العصابات المنظمة',
    text: 'السيطرة على الشوارع والموارد بذكاء وقوة السلاح.',
    accent: 'gang'
  },
  {
    status: 'OPEN',
    state: 'Economy: Stable',
    title: 'المدنيين والملاك',
    text: 'ابدأ تجارتك الخاصة أو ابحث عن وظيفة أحلامك في المدينة.',
    accent: 'citizen'
  }
]

export default function Features() {
  return (
    <section id="features" className="section-block feature-section">
      <div className="section-header center-header small-header">
        <span className="eyebrow">اختيار الهوية</span>
        <h2>أين ستكون؟</h2>
      </div>

      <div className="features-grid choice-grid">
        {(() => {
          const [selected, setSelected] = useState(null)
          return cards.map((card) => (
            <article
              key={card.title}
              className={`feature-card choice-card ${card.accent} ${selected === card.title ? 'selected' : ''}`}
              onClick={() => setSelected(selected === card.title ? null : card.title)}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(selected === card.title ? null : card.title) }}
            >
              <div className="card-topline">
                <span className="tiny-status">{card.status}</span>
                <span className="tiny-state">{card.state}</span>
              </div>
              <div className="card-body">
                <span className="card-badge">{card.accent === 'citizen' ? 'CITIZENS' : card.accent === 'gang' ? 'REBELS' : 'GOV SERVICES'}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
            </article>
          ))
        })()}
      </div>
    </section>
  )
}
