import React from 'react'

const faqs = [
  {
    question: 'هل أحتاج إلى Discord للدخول؟',
    answer: 'نعم، يجب أن تكون عضوًا في خادم Discord الخاص بنا حتى تتمكن من الدخول إلى السيرفر.'
  },
  {
    question: 'هل يوجد دعم فني؟',
    answer: 'نعم، يوجد فريق دعم متاح لمساعدتك في الاستفسارات والطلبات اليومية.'
  },
  {
    question: 'هل يمكن شراء العضوية؟',
    answer: 'نعم، توجد باقات عضوية مختلفة مع مزايا إضافية حسب نوع الخطة المختارة.'
  },
  {
    question: 'هل توجد فعاليات منتظمة؟',
    answer: 'نعم، يقوم الطاقم بتنظيم فعاليات دورية، أسابيع خاصة، ومفاجآت داخل المجتمع.'
  }
]

export default function Faq() {
  return (
    <section id="faq" className="section-block faq-section">
      <div className="section-header center-header small-header">
        <span className="eyebrow">الأسئلة الشائعة</span>
        <h2>كل ما تحتاج معرفته</h2>
      </div>

      <div className="faq-list">
        {faqs.map((item, index) => (
          <details key={item.question} open={index === 0}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
