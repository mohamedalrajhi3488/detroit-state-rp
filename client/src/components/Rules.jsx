import React, { useMemo, useState } from 'react'

const featurePoints = [
  'صُمم السيرفر ليقدم تجربة متكاملة تجمع بين الواقعية، التنوع، والاحترافية في كل تفاصيل المدينة.',
  'أنظمة متطورة ومترابطة، وظائف وتخصصات متعددة، اقتصاد متوازن، ومحتوى متجدد يضمن لك تجربة مختلفة في كل دخول.',
  'أداء عالي واستقرار مستمر، وتفاصيل دقيقة تهدف لصناعة بيئة لعب عادلة وممتعة لجميع اللاعبين.',
  'كل نظام داخل المدينة له هدف، وكل قرار تتخذه يصنع جزءًا من قصتك وتجربتك الخاصة داخل Detroit RP.'
]

const rulesGroups = [
  {
    id: 'basics',
    number: '01',
    title: 'القوانين الأساسية',
    intro: 'هذا المستند يمثل القوانين النهائية والملزمة لجميع سكان المدينة.',
    items: [
      'يُمنع إساءة الكلام أو التهجم على اللاعبين أو الطاقم داخل المدينة أو خارجها.',
      'يُمنع استخدام أي برنامج أو أداة تُخلّ بمعدل اللعب العادل أو تؤدي إلى تغيّر في تجربة اللاعبين.',
      'يجب الالتزام باللعبة داخل السياق الرسمي للسيرفر وعدم الخروج عن القواعد العامة للمدينة.',
      'يجب عدم استخدام أسماء أو أوصاف مسيئة أو مخالفة للهوية الرسمية للمجتمع.'
    ]
  },
  {
    id: 'warnings',
    number: '02',
    title: 'التحذيرات',
    intro: 'تُطبق عقوبات مناسبة وفق خطورة المخالفة، وقد تتدرج من إنذار إلى إيقاف مؤقت أو حظر دائم.',
    items: [
      'التحذير الأول يتم توجيهه عند مخالفة بسيطة، مع إعطاء فرصة للتصحيح.',
      'تُرفع العقوبات في حال التزام اللاعب بالقواعد خلال المدة المحددة.',
      'المخالفات المتكررة تؤدي إلى إيقاف مؤقت ثم حظر في حال تكرارها.',
      'أية محاولة لتجاوز القرار الإداري تُعد مخالفة إضافية ويُعامل عليها وفق النظام.'
    ]
  },
  {
    id: 'general',
    number: '03',
    title: 'القوانين العامة',
    intro: 'تُطبق هذه القوانين على الجميع، دون استثناء، داخل المدينة وخارجها في الأنشطة الرسمية.',
    items: [
      'يُمنع استخدام أي وسيلة لإزعاج اللاعبين أو إفساد التجربة العامة داخل المدينة.',
      'يجب احترام السلوك العام داخل المناطق العامة والخاصة والأنشطة الرسمية.',
      'يُمنع محاولة خداع اللاعبين أو استخدام العلاقات الشخصية لتحقيق أي ميزة غير قانونية.',
      'كل لاعب مسؤول عن حسابه الخاص ولا يجوز مشاركة الحسابات أو استغلالها بأي شكل.'
    ]
  },
  {
    id: 'crime',
    number: '04',
    title: 'قوانين الإجرام',
    intro: 'الأعمال الإجرامية تخضع لأنظمة واضحة ومحددة، ويجب الالتزام بتعليمات القوانين المتعلقة بالسطوة والسرقة والاعتداء.',
    items: [
      'تُمنع سرقة الأصول أو الممتلكات دون وجود نظام قانوني أو موافقة مناسبة.',
      'يُمنع الخطف أو التهديد أو استخدام أساليب غير قانونية لاستهداف اللاعبين.',
      'يجب الالتزام بتوقيت وأسلوب أي حدث إجرامي مع احترام النظام العام.',
      'أي تصرف يختلّ بالتوازن أو يضرّ بالكفاءة داخل المدينة يُعامل وفق النظام الإداري.'
    ]
  },
  {
    id: 'justice',
    number: '05',
    title: 'قوانين العدل',
    intro: 'العدل هو الأساس في التعامل مع الشكاوى والاستئنافات، ويجب احترام القضايا والقرارات الرسمية.',
    items: [
      'يحق لكل لاعب تقديم شكوى رسمية بطريقة منظمة ومناسبة.',
      'يُمنع استخدام الشكاوى بشكل مضلل أو لتأثيرات شخصية أو إرباك الأنظمة.',
      'يجب الالتزام بقرارات الإدارة والهيئات القضائية عند صدورها.',
      'يُعامل أي مخالف في القضايا القانونية وفق الأدلة المتاحة والواقع المعتمد.'
    ]
  }
]

export default function Rules({ pageMode = false }) {
  const [activeRuleId, setActiveRuleId] = useState(rulesGroups[0].id)

  const activeRule = useMemo(
    () => rulesGroups.find((rule) => rule.id === activeRuleId) || rulesGroups[0],
    [activeRuleId]
  )

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
              {rulesGroups.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  className={`rules-page-link ${activeRuleId === rule.id ? 'active' : ''}`}
                  onClick={() => setActiveRuleId(rule.id)}
                >
                  <span className="rules-page-link-number">{rule.number}</span>
                  <span className="rules-page-link-text">{rule.title}</span>
                </button>
              ))}
            </aside>

            <main className="rules-page-content">
              <section className="rules-page-panel">
                <div className="rules-page-panel-head">
                  <span className="rules-page-panel-number">{activeRule.number}</span>
                  <h2>{activeRule.title}</h2>
                </div>

                <ul className="rules-page-panel-list">
                  {activeRule.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
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
