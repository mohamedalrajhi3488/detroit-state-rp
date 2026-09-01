import React, { useMemo, useState, useRef, useEffect } from 'react'

const featurePoints = [
  'صُمم السيرفر ليقدم تجربة متكاملة تجمع بين الواقعية، التنوع، والاحترافية في كل تفاصيل المدينة.',
  'أنظمة متطورة ومترابطة، وظائف وتخصصات متعددة، اقتصاد متوازن، ومحتوى متجدد يضمن لك تجربة مختلفة في كل دخول.',
  'أداء عالي واستقرار مستمر، وتفاصيل دقيقة تهدف لصناعة بيئة لعب عادلة وممتعة لجميع اللاعبين.',
  'كل نظام داخل المدينة له هدف، وكل قرار تتخذه يصنع جزءًا من قصتك وتجربتك الخاصة داخل Detroit RP.'
]
export default function Rules({ pageMode = false, rules = [] }) {
  const groups = Array.isArray(rules) ? rules : []
  const [activeRuleId, setActiveRuleId] = useState(groups.length ? groups[0].id : null)
  const panelRef = useRef(null)

  const activeRule = useMemo(
    () => groups.find((rule) => rule.id === activeRuleId) || groups[0] || null,
    [activeRuleId, groups]
  )

  useEffect(() => {
    // ensure activeRuleId stays valid when groups change
    if (!groups || !groups.length) {
      setActiveRuleId(null)
      return
    }
    if (!activeRuleId) {
      setActiveRuleId(groups[0].id)
      return
    }
    const exists = groups.some((g) => g.id === activeRuleId)
    if (!exists) setActiveRuleId(groups[0].id)
  }, [groups])

  useEffect(() => {
    // scroll panel into view and reset its internal scroll when active rule changes
    try {
      if (panelRef?.current && activeRuleId) {
        panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // if panel has internal overflow, reset scrollTop
        panelRef.current.scrollTop = 0
      }
    } catch (e) {
      // ignore
    }
  }, [activeRuleId])

  if (pageMode) {
    return (
      <section id="rules" className="rules-page-shell">
        <div className="rules-page-inner">
          <header className="rules-page-header">
            <div
              className="rules-page-hero"
              style={{
                backgroundImage: "linear-gradient(90deg, rgba(10, 6, 18, 0.8), rgba(10, 6, 18, 0.36)), url('/img/banner.png')"
              }}
            />

            <div className="rules-page-hero-content">
              <span className="rules-page-eyebrow">القوانين</span>
              <h1>قوانين السيرفر</h1>
              <p>الالتزام بالقوانين يضمن تجربة ممتعة وآمنة للجميع داخل المدينة.</p>
            </div>
          </header>

          <div className="rules-page-layout">
            <aside className="rules-page-sidebar">
              {groups.map((rule, idx) => (
                <button
                  key={rule.id || idx}
                  type="button"
                  className={`rules-page-link ${activeRuleId === (rule.id || null) ? 'active' : ''}`}
                  onClick={() => {
                    setActiveRuleId(rule.id)
                    try {
                      if (panelRef?.current) {
                        panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        panelRef.current.scrollTop = 0
                      }
                    } catch (e) {
                      // ignore
                    }
                  }}
                >
                  <span className="rules-page-link-number">{rule.number || String(idx + 1).padStart(2, '0')}</span>
                  <span className="rules-page-link-text">{rule.title}</span>
                </button>
              ))}
            </aside>

            <main ref={panelRef} className="rules-page-content">
              <section className="rules-page-panel">
                {activeRule ? (
                  <>
                    <div className="rules-page-panel-head">
                      <span className="rules-page-panel-number">{activeRule.number || '01'}</span>
                      <h2>{activeRule.title}</h2>
                    </div>

                    <ul className="rules-page-panel-list">
                      {(activeRule.items || []).map((item) => (
                        <li key={item?.id || item || Math.random()}>{typeof item === 'string' ? item : item.text}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div style={{ padding: '1rem' }}>
                    <p>لا توجد قوانين مضافة حالياً.</p>
                  </div>
                )}
              </section>
            </main>
          </div>
        </div>
      </section>
    )
  }

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
