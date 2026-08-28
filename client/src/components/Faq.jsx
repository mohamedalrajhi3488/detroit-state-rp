import React from 'react'

export const defaultFaqGroups = []

export default function Faq({ groups = defaultFaqGroups }) {
  const faqGroups = Array.isArray(groups) && groups.length ? groups : defaultFaqGroups

  return (
    <section id="faq" className="faq-page-shell">
      <div className="faq-page-inner">
        <header className="faq-header">
          <span className="faq-eyebrow">الأسئلة الشائعة</span>
          <h1>هل لديك أسئلة؟</h1>
          <p>كل المعلومات التي تحتاجها عن السيرفر، العضويات، التحديثات، والنظام موجودة هنا.</p>
        </header>

        {faqGroups.length === 0 ? (
          <div className="faq-empty-state">
            <p>لا توجد أسئلة حالياً. يمكنك إضافة الأسئلة من لوحة الإدارة.</p>
          </div>
        ) : (
          <div className="faq-accordion">
            {faqGroups.map((group) => (
              <div className="faq-group" key={group.id || group.title}>
                <h2>{group.title}</h2>

                {(group.items || []).map((item, index) => (
                  <details key={`${group.id || group.title}-${item.id || item.question}`} className="faq-item" open={index === 0}>
                    <summary>{item.question}</summary>
                    <div className="faq-answer">
                      <p>{item.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
