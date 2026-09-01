import React from 'react'

const featurePoints = [
  'صُمم السيرفر ليقدم تجربة متكاملة تجمع بين الواقعية، التنوع، والاحترافية في كل تفاصيل المدينة.',
  'أنظمة متطورة ومترابطة، وظائف وتخصصات متعددة، اقتصاد متوازن، ومحتوى متجدد يضمن لك تجربة مختلفة في كل دخول.',
  'أداء عالي واستقرار مستمر، وتفاصيل دقيقة تهدف لصناعة بيئة لعب عادلة وممتعة لجميع اللاعبين.',
  'كل نظام داخل المدينة له هدف، وكل قرار تتخذه يصنع جزءًا من قصتك وتجربتك الخاصة داخل Detroit RP.'
]

export default function Rules() {
  return (
    <section id="rules" className="section-block stats-section">
      <div className="section-header center-header small-header">
        <span className="eyebrow">Detroit System</span>
        <h2>مميزات السيرفر</h2>
        <p>تعرف على مميزات سيرفر ديترويت</p>
      </div>

      <div className="feature-showcase">
        <ul className="feature-point-list">
          {featurePoints.map((point) => (
            <li key={point} className="feature-point-item">
              <span className="feature-point-dot" aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
