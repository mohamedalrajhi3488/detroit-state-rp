import React from 'react'

export const defaultFaqGroups = [
  {
    id: 'basics',
    title: 'الأساسيات',
    items: [
      {
        id: 'basics-1',
        question: 'هل أحتاج إلى Discord للدخول؟',
        answer: 'نعم، يجب أن تكون عضوًا في خادم Discord الخاص بنا حتى تتمكن من الدخول إلى السيرفر واستخدام جميع الخدمات.'
      },
      {
        id: 'basics-2',
        question: 'هل يوجد دعم فني؟',
        answer: 'بكل تأكيد. فريق الدعم لدينا متواجد لمساعدتك في كل الاستفسارات، الطلبات، والمشاكل اليومية.'
      },
      {
        id: 'basics-3',
        question: 'هل يمكنني التقديم كطاقم؟',
        answer: 'نعم، يتم فتح التقديمات من وقت لآخر عبر إعلاناتنا الرسمية في السيرفر، ويمكنك متابعة آخر التحديثات من الأخبار.'
      }
    ]
  },
  {
    id: 'account',
    title: 'إعداد الحساب',
    items: [
      {
        id: 'account-1',
        question: 'كيف أبدأ في السيرفر؟',
        answer: 'ابدأ بالانضمام إلى خادم Discord الرسمي، ثم تأكد من قراءة القوانين والأنظمة قبل الدخول إلى اللعبة.'
      },
      {
        id: 'account-2',
        question: 'هل أستطيع تغيير اسم شخصيتي؟',
        answer: 'التغيير يعتمد على النظام المعتمد داخل السيرفر. في بعض الحالات يكون متاحًا من خلال الطاقم أو من خلال إعدادات الحساب.'
      },
      {
        id: 'account-3',
        question: 'ما هي خطوات التسجيل؟',
        answer: 'يُطلب منك عادةً الالتزام بالقوانين، الحضور على Discord، ثم متابعة التعليمات الرسمية داخل السيرفر.'
      }
    ]
  },
  {
    id: 'membership',
    title: 'العضويات',
    items: [
      {
        id: 'membership-1',
        question: 'هل توجد عضويات مدفوعة؟',
        answer: 'نعم، يوجد لدينا باقات عضوية مختلفة تقدم مزايا إضافية، حسب نوع الخطة المختارة.'
      },
      {
        id: 'membership-2',
        question: 'هل توجد مميزات خاصة للأعضاء؟',
        answer: 'بعض المزايا تكون خاصة بالأعضاء المميزين مثل الوصول إلى محتوى أو أدوات إضافية داخل المجتمع.'
      },
      {
        id: 'membership-3',
        question: 'كيف يمكنني شراء العضوية؟',
        answer: 'يمكنك شراء العضوية عبر متجرنا الرسمي داخل الموقع أو الرابط الذي يتم تقديمه من الطاقم.'
      }
    ]
  },
  {
    id: 'community',
    title: 'المجتمع والفعاليات',
    items: [
      {
        id: 'community-1',
        question: 'هل توجد فعاليات منتظمة؟',
        answer: 'نعم، نظّم طاقمنا فعاليات دورية، بطولات، وأحداث خاصة داخل المجتمع بشكل دوري.'
      },
      {
        id: 'community-2',
        question: 'هل يمكن المشاركة في الفعاليات الجديدة؟',
        answer: 'نعم، يتم الإعلان عن جميع الفعاليات عبر Discord والأخبار، وطالما أنت عضو شرعي داخل السيرفر يمكنك المشاركة.'
      },
      {
        id: 'community-3',
        question: 'كيف أعرف آخر الأخبار والتحديثات؟',
        answer: 'من خلال صفحة الأخبار داخل الموقع، بالإضافة إلى قنوات Discord الرسمية في السيرفر.'
      }
    ]
  }
]

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
      </div>
    </section>
  )
}
