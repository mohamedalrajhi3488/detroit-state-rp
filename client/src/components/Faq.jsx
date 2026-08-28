import React from 'react'

export const defaultFaqGroups = []

const renderAnswerContent = (answer = '') => {
  const normalized = String(answer || '').replace(/\r\n/g, '\n').trim()

  if (!normalized) {
    return <p>—</p>
  }

  const blocks = normalized.split(/\n\s*\n/).filter(Boolean)

  return blocks.map((block, blockIndex) => {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const isListBlock = lines.length > 0 && lines.every((line) => /^([•\-*]|\d+\.)\s+/.test(line))

    if (isListBlock) {
      return (
        <ul key={`faq-block-${blockIndex}`} className="faq-answer-list">
          {lines.map((line, lineIndex) => (
            <li key={`${blockIndex}-${lineIndex}`}>
              {line.replace(/^([•\-*]|\d+\.)\s+/, '')}
            </li>
          ))}
        </ul>
      )
    }

    return (
      <p key={`faq-block-${blockIndex}`}>
        {lines.join(' ')}
      </p>
    )
  })
}

export default function Faq({ groups = defaultFaqGroups }) {
  const faqGroups = Array.isArray(groups) && groups.length ? groups : defaultFaqGroups

  return (
    <section id="faq" className="faq-page-shell">
      <div className="faq-page-inner">
        <header className="faq-header">
          <span className="faq-eyebrow">الأسئلة الشائعة</span>
          <h1>هل لديك أسئلة؟</h1>
          <p>كل المعلومات التي تحتاجها عن السيرفر هنا.</p>
        </header>

        {faqGroups.length === 0 ? (
          <div className="faq-empty-state">
            <p>لا توجد أسئلة حالياً.</p>
          </div>
        ) : (
          <div className="faq-accordion">
            {faqGroups.map((group) => (
              <div className="faq-group" key={group.id || group.title}>
                <h2>{group.title}</h2>

                {(group.items || []).map((item) => (
                  <details key={`${group.id || group.title}-${item.id || item.question}`} className="faq-item">
                    <summary>{item.question}</summary>
                    <div className="faq-answer">
                      {renderAnswerContent(item.answer)}
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
