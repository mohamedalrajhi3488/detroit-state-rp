export const defaultPages = [
  { id: 'home', name: 'الرئيسية', status: 'visible', order: 1, type: 'home', description: 'الصفحة الرئيسية للمجتمع.' },
  { id: 'news', name: 'الأخبار', status: 'visible', order: 2, type: 'news', description: 'آخر التحديثات والفعاليات داخل المجتمع.' },
  { id: 'shop', name: 'المتجر', status: 'visible', order: 3, type: 'shop', description: 'خطط العضوية والمزايا الخاصة.' },
  { id: 'tutorials', name: 'الشروحات', status: 'visible', order: 4, type: 'tutorials', description: 'دروس وإرشادات للمستخدمين الجدد.' },
  { id: 'jobs', name: 'الوظائف', status: 'visible', order: 5, type: 'jobs', description: 'فرص العمل والوظائف داخل المدينة.' },
  { id: 'quiz', name: 'الاختبارات', status: 'visible', order: 6, type: 'quiz', description: 'اختبارات ومهام داخل المجتمع.' },
  { id: 'rules', name: 'القوانين', status: 'visible', order: 7, type: 'rules', description: 'قوانين النظام وقواعد اللعبة.' },
  { id: 'tournaments', name: 'البطولات', status: 'visible', order: 8, type: 'tournaments', description: 'بطولات المسابقات والفعاليات.' },
  { id: 'activities', name: 'الأنشطة', status: 'hidden', order: 9, type: 'activities', description: 'سجل كامل للأنشطة والفعاليات داخل الموقع.' }
]

export const resolvePageType = (page, index = 0) => {
  const id = String(page?.id || '').trim().toLowerCase()
  const name = String(page?.name || '').trim()

  if (page?.type) return page.type
  if (id === 'shop' || name.includes('متجر')) return 'shop'
  if (id === 'news' || name.includes('خبر') || name.includes('أخبار')) return 'news'
  if (id === 'jobs' || name.includes('وظيفة') || name.includes('وظائف')) return 'jobs'
  if (id === 'rules' || name.includes('قانون') || name.includes('قوانين')) return 'rules'
  if (id === 'activities' || name.includes('نشاط') || name.includes('أنشطة')) return 'activities'
  if (id === 'tutorials' || name.includes('شرح') || name.includes('شروحات')) return 'tutorials'
  if (id === 'quiz' || name.includes('اختبار')) return 'quiz'
  if (id === 'tournaments' || name.includes('بطولة')) return 'tournaments'
  return page?.type || `custom-page-${index + 1}`
}

export const normalizePages = (pages = defaultPages) => (pages || defaultPages).map((page, index) => ({
  ...page,
  id: page.id || `custom-page-${index + 1}`,
  name: page.name || `صفحة ${index + 1}`,
  status: page.status || 'visible',
  order: page.order || index + 1,
  type: resolvePageType(page, index),
  externalUrl: page.externalUrl || '',
  description: page.description || 'محتوى هذه الصفحة يتم التحكم به من لوحة الإدارة.'
}))

export const isPageAccessible = (page, role = 'member') => {
  const normalizedRole = String(role || 'member').toLowerCase()
  const roleAllowsAdmin = ['owner', 'admin', 'mod'].includes(normalizedRole)
  const pageType = String(page?.type || page?.id || '').toLowerCase()

  if (pageType === 'activities' || page?.id === 'activities') {
    return roleAllowsAdmin
  }

  return page?.status === 'visible' || page?.status === undefined
}
