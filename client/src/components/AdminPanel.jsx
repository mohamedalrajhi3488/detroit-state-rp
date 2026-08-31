import React, { useEffect, useMemo, useState } from 'react'
import { defaultFaqGroups } from './Faq'
import { savePagesToFirestore, saveShopProductsToFirestore, saveCreatorsToFirestore, saveNewsToFirestore, saveUsersToFirestore, saveStaffToFirestore, saveFaqGroupsToFirestore, saveQuizQuestionsToFirestore, saveQuizResultsToFirestore } from '../firebase'

const formatNumericActivityTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const day = toLatinDigits(String(date.getDate()).padStart(2, '0'))
  const month = toLatinDigits(String(date.getMonth() + 1).padStart(2, '0'))
  const year = toLatinDigits(String(date.getFullYear()))
  const hours = toLatinDigits(String(date.getHours() % 12 || 12).padStart(2, '0'))
  const minutes = toLatinDigits(String(date.getMinutes()).padStart(2, '0'))
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM'

  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`
}

const resolveActivityName = (entry) => {
  if (!entry) return 'مستخدم'
  return String(entry.user || entry.name || entry.username || entry.displayName || 'مستخدم').trim() || 'مستخدم'
}

const resolveActivityAction = (entry) => {
  const rawAction = String(entry?.action || entry?.detail || 'تسجيل دخول').trim()
  if (!rawAction) return 'قام بتسجيل الدخول إلى الموقع'
  const normalized = rawAction.toLowerCase()
  if (normalized.includes('تسجيل دخول') || normalized.includes('login')) return 'قام بتسجيل الدخول إلى الموقع'
  if (normalized.includes('تحديث') || normalized.includes('update')) return 'قام بتحديث حسابه'
  return rawAction
}

const normalizeActivityColor = (entry) => {
  const rawAction = String(entry?.action || entry?.detail || '').trim().toLowerCase()
  const rawColor = String(entry?.color || '').trim().toLowerCase()

  const knownColors = ['gold', 'blue', 'pink', 'green']
  if (knownColors.includes(rawColor)) return rawColor

  if (!rawAction || rawAction.includes('login') || rawAction.includes('تسجيل دخول')) return 'blue'
  if (rawAction.includes('تحديث') || rawAction.includes('update') || rawAction.includes('تعديل')) return 'gold'
  if (rawAction.includes('حذف') || rawAction.includes('delete')) return 'pink'
  if (rawAction.includes('إضافة') || rawAction.includes('add') || rawAction.includes('create')) return 'green'

  return 'blue'
}

const formatRelativeActivityTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'الآن'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (diffMinutes <= 0) return 'الآن'
  if (diffMinutes < 60) return `منذ ${toLatinDigits(String(diffMinutes))} دقيقة`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `منذ ${toLatinDigits(String(diffHours))} ساعة`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 2) return 'منذ يوم'

  return formatNumericActivityTime(value)
}

const toLatinDigits = (value) => String(value ?? '').replace(/[٠-٩]/g, (char) => '٠١٢٣٤٥٦٧٨٩'.indexOf(char)).replace(/[۰-۹]/g, (char) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(char))

const resolveUsableDate = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue

    if (value instanceof Date) {
      if (!Number.isNaN(value.getTime())) return value
      continue
    }

    if (typeof value === 'number') {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) return date
      continue
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) continue

      const normalized = trimmed.toLowerCase()
      if (['الآن', 'now', 'today'].includes(normalized)) continue

      const date = new Date(trimmed)
      if (!Number.isNaN(date.getTime())) return date
    }
  }

  return null
}

const formatLastSeen = (value, fallbackValue = null) => {
  const date = resolveUsableDate(value, fallbackValue)
  if (!date) return '—'

  const day = toLatinDigits(String(date.getDate()).padStart(2, '0'))
  const month = toLatinDigits(String(date.getMonth() + 1).padStart(2, '0'))
  const year = toLatinDigits(String(date.getFullYear()))
  const hours = toLatinDigits(String(date.getHours() % 12 || 12).padStart(2, '0'))
  const minutes = toLatinDigits(String(date.getMinutes()).padStart(2, '0'))
  const seconds = toLatinDigits(String(date.getSeconds()).padStart(2, '0'))
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM'

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${ampm}`
}

const normalizeUserRole = (role) => {
  const value = (role || '').toString().trim()
  if (!value) return 'Member'

  const lower = value.toLowerCase()
  if (['owner', 'اونر'].includes(lower)) return 'Owner'
  if (['admin', 'administrator', 'ادمن'].includes(lower)) return 'Admin'
  if (['mod', 'moderator', 'moderation', 'مود', 'مدير'].includes(lower)) return 'Mod'
  return 'Member'
}

const formatQuizResultDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

const resolvePageType = (page, fallbackIndex = 0) => {
  const id = String(page?.id || '').trim().toLowerCase()
  const name = String(page?.name || '').trim()

  if (page?.type) return page.type
  if (id === 'shop' || name.includes('متجر')) return 'shop'
  if (id === 'news' || name.includes('خبر') || name.includes('أخبار')) return 'news'
  if (id === 'jobs' || name.includes('وظيفة') || name.includes('وظائف')) return 'jobs'
  if (id === 'rules' || name.includes('قانون') || name.includes('قوانين')) return 'rules'
  if (id === 'activities' || name.includes('نشاط') || name.includes('أنشطة')) return 'activities'
  if (id === 'faq' || id === 'tutorials' || name.includes('faq') || name.includes('أسئلة') || name.includes('سؤال') || name.includes('شرح') || name.includes('شروحات')) return 'faq'
  if (id === 'quiz' || name.includes('اختبار')) return 'quiz'
  if (id === 'tournaments' || name.includes('بطولة')) return 'tournaments'
  return page?.type || `custom-page-${fallbackIndex + 1}`
}

const roleOptions = ['Owner', 'Admin', 'Mod', 'Member']

const defaultQuizQuestions = []

const getAvailableTabs = (role) => {
  const normalized = normalizeUserRole(role)

  if (normalized === 'Owner') {
    return ['dashboard', 'pages', 'faq', 'quiz', 'quiz-results', 'shop', 'users', 'creators', 'staff', 'news', 'activities', 'settings']
  }

  if (normalized === 'Admin') {
    return ['dashboard', 'quiz-results', 'news', 'activities']
  }

  if (normalized === 'Mod') {
    return ['dashboard', 'quiz-results', 'news', 'activities']
  }

  return []
}

export default function AdminPanel({ user, data, activityLog = [], onDataChange, onActivityAdd, onActivityDelete, onDeleteAllActivities, onLogout }) {
  const [pages, setPages] = useState(data?.pages || [])
  const [users, setUsers] = useState(data?.users || [])
  const [creators, setCreators] = useState(data?.creators || [])
  const [staff, setStaff] = useState(data?.staff || [])
  const [news, setNews] = useState(data?.news || [])
  const [shopProducts, setShopProducts] = useState(data?.products || [])
  const [settings, setSettings] = useState(data?.settings || {})
  const [selectedTab, setSelectedTab] = useState('dashboard')
  const [notice, setNotice] = useState({ type: 'info', text: 'لوحة التحكم ديترويت — تم انشاءها وتطويرها من قبل Dreko8u.' })
  const [dashboardStats, setDashboardStats] = useState({ members: 0, onlinePlayers: 0, supportTickets: 0, registeredUsers: 0 })
  const [chartHover, setChartHover] = useState({ active: false, index: 0, value: 0, label: '' })
  const [userSearch, setUserSearch] = useState('')
  const [creatorSearch, setCreatorSearch] = useState('')
  const [activitySearch, setActivitySearch] = useState('')
  const [quizResultsSearch, setQuizResultsSearch] = useState('')
  const [creatorFormOpen, setCreatorFormOpen] = useState(false)
  const [staffFormOpen, setStaffFormOpen] = useState(false)
  const [pageFormOpen, setPageFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [activityDeleteConfirm, setActivityDeleteConfirm] = useState(null)
  const [shopSearch, setShopSearch] = useState('')
  const [creatorForm, setCreatorForm] = useState({
    id: null,
    name: '',
    platform: 'TikTok',
    followers: '',
    image: '',
    url: '',
    visible: true
  })

  const [staffForm, setStaffForm] = useState({
    id: null,
    name: '',
    username: '',
    title: '',
    role: 'staff',
    group: 'staff',
    account: '',
    socialLinks: '',
    image: '',
    url: '',
    visible: true
  })

  const [pageForm, setPageForm] = useState({
    id: null,
    name: '',
    status: 'visible',
    externalUrl: ''
  })

  const [faqGroups, setFaqGroups] = useState(Array.isArray(data?.faqGroups) && data.faqGroups.length ? data.faqGroups : defaultFaqGroups)
  const [faqDraftGroups, setFaqDraftGroups] = useState(Array.isArray(data?.faqGroups) && data.faqGroups.length ? data.faqGroups : defaultFaqGroups)
  const [faqGroupModalOpen, setFaqGroupModalOpen] = useState(false)
  const [faqGroupForm, setFaqGroupForm] = useState({ title: '' })
  const [quizQuestions, setQuizQuestions] = useState(Array.isArray(data?.quizQuestions) && data.quizQuestions.length ? data.quizQuestions : defaultQuizQuestions)
  const [quizDraftQuestions, setQuizDraftQuestions] = useState(Array.isArray(data?.quizQuestions) && data.quizQuestions.length ? data.quizQuestions : defaultQuizQuestions)
  const [quizTimeoutMinutesDraft, setQuizTimeoutMinutesDraft] = useState(Number(settings?.quizTimeoutMinutes || 5))
  const [quizResults, setQuizResults] = useState(Array.isArray(data?.quizResults) ? data.quizResults : [])
  const [expandedResultId, setExpandedResultId] = useState(null)

  const [shopForm, setShopForm] = useState({
    id: null,
    name: '',
    price: '',
    currency: 'ر.س',
    description: '',
    link: '',
    image: '',
    image2: '',
    image3: '',
    image4: '',
    featured: false
  })

  const [shopFormOpen, setShopFormOpen] = useState(false)

  const currentUserRole = normalizeUserRole(
    user?.role || users.find((userItem) => String(userItem.id) === String(user?.id))?.role || 'Member'
  )
  const isOwner = currentUserRole === 'Owner'
  const allowedTabs = getAvailableTabs(currentUserRole)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) setMobileSidebarOpen(false)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (window.innerWidth > 900) setMobileSidebarOpen(false)
  }, [selectedTab])

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileSidebarOpen])

  useEffect(() => {
    setPages(data?.pages || [])
    setUsers(data?.users || [])
    setCreators(data?.creators || [])
    setStaff(data?.staff || [])
    setNews(data?.news || [])
    setShopProducts(data?.products || [])
    setSettings(data?.settings || {})
    setQuizTimeoutMinutesDraft(Number((data?.settings?.quizTimeoutMinutes ?? 5)))
    const nextFaqGroups = Array.isArray(data?.faqGroups) && data.faqGroups.length ? data.faqGroups : defaultFaqGroups
    setFaqGroups(nextFaqGroups)
    setFaqDraftGroups(nextFaqGroups)
    const nextQuizQuestions = Array.isArray(data?.quizQuestions) && data.quizQuestions.length ? data.quizQuestions : defaultQuizQuestions
    setQuizQuestions(nextQuizQuestions)
    setQuizDraftQuestions(nextQuizQuestions)
    setQuizResults(Array.isArray(data?.quizResults) ? data.quizResults : [])
  }, [data])

  useEffect(() => {
    if (allowedTabs.length && !allowedTabs.includes(selectedTab)) {
      setSelectedTab('dashboard')
    }
  }, [allowedTabs, selectedTab])

  const commitData = (
    nextPages = pages,
    nextUsers = users,
    nextCreators = creators,
    nextNews = news,
    nextSettings = settings,
    nextProducts = shopProducts,
    nextStaff = staff,
    nextFaqGroups = faqGroups,
    nextQuizQuestions = quizQuestions,
    nextQuizResults = quizResults
  ) => {
    const payload = {
      pages: nextPages,
      users: nextUsers,
      creators: nextCreators,
      news: nextNews,
      settings: nextSettings,
      products: nextProducts,
      staff: nextStaff,
      faqGroups: nextFaqGroups,
      quizQuestions: nextQuizQuestions,
      quizResults: nextQuizResults
    }

    setPages(nextPages)
    setUsers(nextUsers)
    setCreators(nextCreators)
    setStaff(nextStaff)
    setNews(nextNews)
    setSettings(nextSettings)
    setShopProducts(nextProducts)
    setFaqGroups(nextFaqGroups)
    setQuizQuestions(nextQuizQuestions)
    setQuizResults(nextQuizResults)

    // DEBUG: log commit payload for troubleshooting product deletion
    try {
      console.debug('commitData payload products:', Array.isArray(nextProducts) ? nextProducts.map(p => p.id || p.name) : nextProducts)
    } catch (e) {
      // ignore
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('detroitstate_site_data_v1') || '{}')
        localStorage.setItem('detroitstate_site_data_v1', JSON.stringify({ ...stored, ...payload }))
      } catch {
        // ignore localStorage persistence issues
      }
    }

    if (typeof onDataChange === 'function') {
      onDataChange((current) => ({
        ...current,
        pages: nextPages,
        users: nextUsers,
        creators: nextCreators,
        news: nextNews,
        settings: nextSettings,
        products: nextProducts,
        staff: nextStaff,
        faqGroups: nextFaqGroups,
        quizQuestions: nextQuizQuestions,
        quizResults: nextQuizResults
      }))
    }

    if (Array.isArray(nextPages)) {
      savePagesToFirestore(nextPages).catch((err) => { console.warn('savePagesToFirestore error:', err); notify('error', 'فشل حفظ الصفحات إلى Firestore.'); })
    }

    if (Array.isArray(nextCreators)) {
      saveCreatorsToFirestore(nextCreators).catch((err) => { console.warn('saveCreatorsToFirestore error:', err); notify('error', 'فشل حفظ صانعي المحتوى إلى Firestore.'); })
    }

    if (Array.isArray(nextNews)) {
      saveNewsToFirestore(nextNews).catch((err) => { console.warn('saveNewsToFirestore error:', err); notify('error', 'فشل حفظ الأخبار إلى Firestore.'); })
    }

    if (Array.isArray(nextUsers)) {
      saveUsersToFirestore(nextUsers).catch((err) => { console.warn('saveUsersToFirestore error:', err); notify('error', 'فشل حفظ المستخدمين إلى Firestore.'); })
    }

    if (Array.isArray(nextProducts)) {
      saveShopProductsToFirestore(nextProducts).catch((err) => { console.warn('saveShopProductsToFirestore error:', err) })
    }

    if (Array.isArray(nextStaff)) {
      saveStaffToFirestore(nextStaff).catch((err) => { console.warn('saveStaffToFirestore error:', err); notify('error', 'فشل حفظ الطاقم الإداري إلى Firestore.'); })
    }

    if (Array.isArray(nextFaqGroups)) {
      saveFaqGroupsToFirestore(nextFaqGroups).catch((err) => { console.warn('saveFaqGroupsToFirestore error:', err); notify('error', 'فشل حفظ الأسئلة إلى Firestore.'); })
    }

    if (Array.isArray(nextQuizQuestions)) {
      saveQuizQuestionsToFirestore(nextQuizQuestions).catch((err) => { console.warn('saveQuizQuestionsToFirestore error:', err); notify('error', 'فشل حفظ أسئلة الاختبار إلى Firestore.'); })
    }

    if (Array.isArray(nextQuizResults)) {
      saveQuizResultsToFirestore(nextQuizResults).catch((err) => { console.warn('saveQuizResultsToFirestore error:', err); notify('error', 'فشل حفظ نتائج الاختبار إلى Firestore.'); })
    }
  }

  const stats = useMemo(() => ({
    users: users.length,
    pages: pages.filter((p) => p.status === 'visible').length,
    hidden: pages.filter((p) => p.status === 'hidden').length,
    creators: creators.filter((c) => c.visible !== false).length,
    online: dashboardStats.onlinePlayers || 0
  }), [users, pages, creators, dashboardStats.onlinePlayers])

  const saveQuizDraft = () => {
    const nextSettings = { ...settings, quizTimeoutMinutes: Math.max(1, Number(quizTimeoutMinutesDraft) || 5) }
    setQuizQuestions(quizDraftQuestions)
    setSettings(nextSettings)
    commitData(pages, users, creators, news, nextSettings, shopProducts, staff, faqGroups, quizDraftQuestions, quizResults)
    addAdminActivity('تعديل أسئلة الاختبار', `المستخدم ${user?.name || user?.username || 'Admin'} قام بتعديل أسئلة الاختبار الإلكتروني.`, 'gold')
    notify('success', 'تم حفظ أسئلة الاختبار بنجاح.')
  }

  const awardQuizRole = async (result) => {
    if (!result?.discordId) return

    const resolvedRoleId = String(result.roleId || settings?.successRoleId || '1542968359266811944')

    try {
      const response = await fetch('/api/discord/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: String(result.discordId), roleId: resolvedRoleId })
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'role_assignment_failed')
      }

      const nextResults = (quizResults || []).map((item) => String(item.id) === String(result.id) ? { ...item, reviewed: true, passed: true, roleGranted: true } : item)
      setQuizResults(nextResults)
      commitData(pages, users, creators, news, settings, shopProducts, staff, faqGroups, quizQuestions, nextResults)
      addAdminActivity('منح رتبة نجاح', `المستخدم ${user?.name || user?.username || 'Admin'} قام بمنح رتبة النجاح للمستخدم: ${result?.userName || result?.discordId || 'غير معروف'}`, 'green')
      notify('success', 'تم منح رتبة النجاح بنجاح.')
    } catch (error) {
      console.warn('Discord role assignment failed:', error)
      notify('error', 'فشل منح رتبة النجاح. تأكد من إعداد البوت والعضوية.')
    }
  }

  const revokeQuizRole = async (result) => {
    if (!result?.discordId) return

    const resolvedRoleId = String(result.roleId || settings?.successRoleId || '1542968359266811944')

    try {
      const response = await fetch('/api/discord/remove-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: String(result.discordId), roleId: resolvedRoleId })
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'role_removal_failed')
      }

      const nextResults = (quizResults || []).map((item) => String(item.id) === String(result.id)
        ? { ...item, reviewed: false, passed: true, roleGranted: false }
        : item)

      setQuizResults(nextResults)
      commitData(pages, users, creators, news, settings, shopProducts, staff, faqGroups, quizQuestions, nextResults)
      addAdminActivity('سحب رتبة نجاح', `المستخدم ${user?.name || user?.username || 'Admin'} قام بسحب رتبة النجاح من المستخدم: ${result?.userName || result?.discordId || 'غير معروف'}`, 'pink')
      notify('success', 'تم سحب رتبة النجاح بنجاح.')
    } catch (error) {
      console.warn('Discord role removal failed:', error)
      notify('error', 'فشل سحب رتبة النجاح. تأكد من إعداد البوت والعضوية.')
    }
  }

  const clearQuizFailureForUser = (userId) => {
    if (!userId || typeof window === 'undefined') return

    const normalizedUserId = String(userId)
    const keysToRemove = []

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && key.startsWith('quiz-failed-') && (key === `quiz-failed-${normalizedUserId}` || key.endsWith(`-${normalizedUserId}`))) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }

  const deleteQuizResult = (resultId) => {
    const result = (quizResults || []).find((item) => String(item.id) === String(resultId))
    const nextResults = (quizResults || []).filter((item) => String(item.id) !== String(resultId))
    const targetUserId = result?.discordId ? String(result.discordId) : null
    if (targetUserId) {
      clearQuizFailureForUser(targetUserId)
    }
    setQuizResults(nextResults)
    commitData(pages, users, creators, news, settings, shopProducts, staff, faqGroups, quizQuestions, nextResults)
    addAdminActivity('حذف نتيجة اختبار', `المستخدم ${user?.name || user?.username || 'Admin'} قام بحذف نتيجة الاختبار: ${result?.userName || 'غير معروف'}`, 'pink')
    notify('success', 'تم حذف نتيجة الاختبار بنجاح.')
  }

  const deleteFaqGroup = (groupId) => {
    const group = (faqDraftGroups || []).find((item) => item.id === groupId)
    const nextGroups = (faqDraftGroups || []).filter((item) => item.id !== groupId)
    setFaqDraftGroups(nextGroups)
    addAdminActivity('حذف قسم أسئلة', `المستخدم ${user?.name || user?.username || 'Admin'} قام بحذف قسم الأسئلة: ${group?.title || 'غير معروف'}`, 'pink')
    notify('success', 'تم حذف قسم الأسئلة بنجاح.')
  }

  const deleteFaqItem = (groupId, itemId) => {
    const group = (faqDraftGroups || []).find((entry) => entry.id === groupId)
    const item = (group?.items || []).find((questionItem) => questionItem.id === itemId)
    const nextGroups = (faqDraftGroups || []).map((groupEntry) => groupEntry.id === groupId
      ? { ...groupEntry, items: (groupEntry.items || []).filter((questionItem) => questionItem.id !== itemId) }
      : groupEntry)
    setFaqDraftGroups(nextGroups)
    addAdminActivity('حذف سؤال', `المستخدم ${user?.name || user?.username || 'Admin'} قام بحذف سؤال من قسم ${group?.title || 'الأسئلة'}: ${item?.question || 'غير معروف'}`, 'pink')
    notify('success', 'تم حذف السؤال بنجاح.')
  }

  const deleteQuizQuestion = (questionIndex) => {
    const question = (quizDraftQuestions || [])[questionIndex]
    const nextQuestions = (quizDraftQuestions || []).filter((_, index) => index !== questionIndex)
    setQuizDraftQuestions(nextQuestions)
    addAdminActivity('حذف سؤال اختبار', `المستخدم ${user?.name || user?.username || 'Admin'} قام بحذف سؤال الاختبار: ${question?.question || `السؤال ${questionIndex + 1}`}`, 'pink')
    notify('success', 'تم حذف السؤال بنجاح.')
  }

  const resolveActivityAvatar = (entry) => {
    if (entry?.avatar) return entry.avatar

    const userName = String(entry?.user || '').trim().toLowerCase()
    if (!userName) return null

    const matchedUser = Array.isArray(data?.users)
      ? data.users.find((userItem) => {
          const userItemName = String(userItem?.name || '').trim().toLowerCase()
          const userItemEmail = String(userItem?.email || '').trim().toLowerCase()
          return userItemName === userName || userItemEmail === userName || userItemName.includes(userName) || userName.includes(userItemName)
        })
      : null

    return matchedUser?.avatar || null
  }

  const recentActivity = useMemo(() => {
    const source = activityLog.length ? activityLog : users.slice(0, 4).map((userItem, index) => ({
      id: userItem.id || `${userItem.name}-${index}`,
      user: userItem.name || `user${index + 1}`,
      action: 'تسجيل دخول',
      detail: 'تم تسجيل الدخول إلى الموقع بنجاح.',
      time: new Date(Date.now() - (index + 1) * 60 * 60 * 1000).toISOString(),
      color: ['gold', 'blue', 'pink', 'green'][index % 4]
    }))

    return source.slice(0, 4).map((entry, index) => ({
      id: entry.id || `${resolveActivityName(entry)}-${index}`,
      name: resolveActivityName(entry),
      avatar: resolveActivityAvatar(entry),
      time: formatRelativeActivityTime(entry.time || Date.now()),
      role: resolveActivityAction(entry),
      color: normalizeActivityColor(entry) || ['gold', 'blue', 'pink', 'green'][index % 4]
    }))
  }, [activityLog, users, data?.users])

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    if (!query) return users

    return users.filter((userItem) => {
      const haystack = [
        userItem.name,
        userItem.email,
        userItem.role,
        normalizeUserRole(userItem.role),
        userItem.id
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(query)
    })
  }, [users, userSearch])

  const filteredCreators = useMemo(() => {
    const query = creatorSearch.trim().toLowerCase()
    if (!query) return creators

    return creators.filter((creator) => {
      const haystack = [
        creator.name,
        creator.platform,
        creator.followers,
        creator.url,
        creator.id,
        creator.visible === false ? 'hidden' : 'visible'
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(query)
    })
  }, [creators, creatorSearch])

  const filteredStaff = useMemo(() => {
    const query = creatorSearch.trim().toLowerCase()
    if (!query) return staff

    return staff.filter((member) => {
      const haystack = [
        member.name,
        member.username,
        member.title,
        member.role,
        member.account,
        member.url,
        member.id,
        member.visible === false ? 'hidden' : 'visible'
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(query)
    })
  }, [staff, creatorSearch])

  const filteredActivities = useMemo(() => {
    const query = activitySearch.trim().toLowerCase()
    if (!query) return activityLog

    return activityLog.filter((entry) => {
      const haystack = [
        entry.user,
        entry.action,
        entry.detail,
        entry.color,
        entry.id
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(query)
    })
  }, [activityLog, activitySearch])

  const filteredQuizResults = useMemo(() => {
    const query = quizResultsSearch.trim().toLowerCase()
    if (!query) return quizResults

    return (quizResults || []).filter((result) => {
      const haystack = [
        result.userName,
        result.discordId,
        result.passed ? 'نجح' : 'لم ينجح',
        result.passed ? 'passed' : 'failed',
        String(result.score || 0),
        String(result.total || 0),
        formatQuizResultDate(result.submittedAt || Date.now()),
        result.roleGranted ? 'تم المنح' : 'لم يتم المنح',
        result.reviewed ? 'مراجع' : 'غير مراجع',
        result.id
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(query)
    })
  }, [quizResults, quizResultsSearch])

  const chartSeries = useMemo(() => {
    const labels = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    const history = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const floor = new Date(date.getFullYear(), date.getMonth(), date.getDate())

      const total = activityLog.filter((entry) => {
        const entryDate = new Date(entry.time)
        return entryDate >= floor && entryDate < new Date(floor.getTime() + 24 * 60 * 60 * 1000) && entry.action === 'تسجيل دخول'
      }).length

      return {
        label: labels[index],
        value: total || (index === 6 ? Math.max(1, users.length || 3) : Math.max(0, Math.min(6, users.length - index)))
      }
    })

    return history
  }, [activityLog, users.length])

  const chartPoints = chartSeries.map((entry) => entry.value)

  useEffect(() => {
    let active = true

    const loadDashboardStats = async () => {
      try {
        const [discordRes, serverRes] = await Promise.all([
          fetch('/api/discord-count', { cache: 'no-store' }),
          fetch('/api/server-status', { cache: 'no-store' })
        ])

        const discordData = discordRes.ok ? await discordRes.json() : {}
        const serverData = serverRes.ok ? await serverRes.json() : {}

        const playersPayload = serverData?.players ?? serverData?.Data?.players ?? serverData?.data?.players ?? []
        const onlinePlayers = Array.isArray(playersPayload)
          ? playersPayload.length
          : Number(playersPayload || 0)

        if (!active) return

        setDashboardStats({
          members: Number(discordData?.count || 0),
          onlinePlayers: Number.isFinite(onlinePlayers) ? onlinePlayers : 0,
          supportTickets: creators.length,
          registeredUsers: users.length
        })
      } catch {
        if (!active) return
        setDashboardStats({
          members: users.length,
          onlinePlayers: 0,
          supportTickets: creators.length,
          registeredUsers: users.length
        })
      }
    }

    loadDashboardStats()
    const intervalId = window.setInterval(loadDashboardStats, 15000)
    return () => { active = false; window.clearInterval(intervalId) }
  }, [users.length, creators.length])

  const openActivityFeed = () => {
    setSelectedTab('activities')
    if (typeof window !== 'undefined') {
      window.location.hash = '#/activities'
    }
  }

  const addPage = () => {
    const name = window.prompt('اسم الصفحة الجديدة؟')
    if (!name) return

    const cleanName = name.trim()
    const id = cleanName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'new-page'
    const nextPages = [...pages, { id, name: cleanName, status: 'visible', order: pages.length + 1 }]
    commitData(nextPages, users, creators, news, settings)
    addAdminActivity('إضافة صفحة', `المستخدم ${user?.name || user?.username || 'Admin'} قام بإضافة الصفحة: ${cleanName}`, 'green')
    notify('success', `تمت إضافة الصفحة: ${cleanName}`)
  }

  const togglePage = (id) => {
    const page = pages.find((item) => item.id === id)
    const nextStatus = page?.status === 'visible' ? 'hidden' : 'visible'
    const nextPages = pages.map((pageItem) => pageItem.id === id ? {
      ...pageItem,
      status: nextStatus
    } : pageItem)
    commitData(nextPages, users, creators, news, settings)
    addAdminActivity(nextStatus === 'visible' ? 'إظهار صفحة' : 'إخفاء صفحة', `المستخدم ${user?.name || user?.username || 'Admin'} قام ${nextStatus === 'visible' ? 'بإظهار' : 'بإخفاء'} الصفحة: ${page?.name || 'غير معروف'}`, nextStatus === 'visible' ? 'green' : 'pink')
    notify('success', 'تم تحديث حالة الصفحة بنجاح.')
  }

  const deletePage = (id) => {
    const page = pages.find((item) => item.id === id)
    const nextPages = pages.filter((pageItem) => pageItem.id !== id)
    commitData(nextPages, users, creators, news, settings)
    addAdminActivity('حذف صفحة', `المستخدم ${user?.name || user?.username || 'Admin'} قام بحذف الصفحة: ${page?.name || 'غير معروف'}`, 'pink')
    notify('success', 'تم حذف الصفحة بنجاح.')
  }

  const addUser = () => {
    const name = window.prompt('اسم المستخدم الجديد؟')
    if (!name) return

    const email = window.prompt('البريد الإلكتروني؟', 'newuser@example.com')
    if (!email) return

    const nextUser = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      role: 'Member',
      lastSeen: new Date().toISOString()
    }

    const nextUsers = [...users, nextUser]
    commitData(pages, nextUsers, creators, news, settings)
    addAdminActivity('إضافة حساب', `المستخدم ${user?.name || user?.username || 'Admin'} قام بإضافة حساب: ${nextUser.name}`, 'green')
    notify('success', `تمت إضافة المستخدم: ${nextUser.name}`)
  }

  const deleteUser = (id) => {
    const userToDelete = users.find((userItem) => String(userItem.id) === String(id))
    const nextUsers = users.filter((userItem) => String(userItem.id) !== String(id))
    commitData(pages, nextUsers, creators, news, settings)
    addAdminActivity('حذف حساب', `المستخدم ${user?.name || user?.username || 'Admin'} قام بحذف الحساب: ${userToDelete?.name || 'غير معروف'}`, 'pink')
    notify('success', 'تم حذف المستخدم بنجاح.')
  }

  const updateUserRole = (id, nextRole) => {
    const normalizedRole = normalizeUserRole(nextRole)
    const selectedUser = users.find((userItem) => userItem.id === id)
    const nextUsers = users.map((userItem) => userItem.id === id ? { ...userItem, role: normalizedRole } : userItem)
    commitData(pages, nextUsers, creators, news, settings)
    addAdminActivity('تغيير صلاحية حساب', `المستخدم ${user?.name || user?.username || 'Admin'} قام بتعديل صلاحية ${selectedUser?.name || 'المستخدم'} إلى ${normalizedRole}`, 'gold')
    notify('success', `تم تعديل صلاحيات المستخدم إلى ${normalizedRole}.`)
  }

  const notify = (type, text) => setNotice({ type, text })

  const addAdminActivity = (action, detail, color = 'blue') => {
    if (typeof onActivityAdd !== 'function') return

    const actorName = user?.name || user?.username || 'Admin'
    const actorAvatar = user?.avatar || '/img/DS.webp'

    onActivityAdd({
      id: `admin-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      user: actorName,
      avatar: actorAvatar,
      action,
      detail,
      color,
      time: new Date().toISOString()
    })
  }

  const resetCreatorForm = () => {
    setCreatorForm({
      id: null,
      name: '',
      platform: 'TikTok',
      followers: '',
      image: '',
      visible: true
    })
  }

  const resetStaffForm = () => {
    setStaffForm({
      id: null,
      name: '',
      username: '',
      title: '',
      role: 'staff',
      group: 'staff',
      account: '',
      image: '',
      url: '',
      visible: true
    })
  }

  const resetPageForm = () => {
    setPageForm({
      id: '',
      name: '',
      status: 'visible',
      externalUrl: ''
    })
  }

  const openCreateCreator = () => {
    resetCreatorForm()
    setCreatorFormOpen(true)
  }

  const openCreatePage = () => {
    resetPageForm()
    setPageFormOpen(true)
  }

  const openCreateStaff = () => {
    resetStaffForm()
    setStaffFormOpen(true)
  }

  const openEditStaff = (member) => {
    setStaffForm({
      ...member,
      name: member.name || '',
      username: member.username || member.title || '',
      title: member.title || member.role || '',
      role: member.role || member.group || 'staff',
      group: member.group || member.role || 'staff',
      account: member.account || '',
      socialLinks: (Array.isArray(member.socials) ? member.socials : []).map((item) => item.url || item.href || item).join('\n'),
      image: member.image || '',
      url: member.url || '',
      visible: member.visible !== false
    })
    setStaffFormOpen(true)
  }

  const openEditPage = (page) => {
    setPageForm({
      id: page.id,
      name: page.name || '',
      status: page.status || 'visible',
      externalUrl: page.externalUrl || ''
    })
    setPageFormOpen(true)
  }

  const openEditCreator = (creator) => {
    setCreatorForm({
      ...creator,
      visible: creator.visible !== false,
      followers: creator.followers || '',
      url: creator.url || ''
    })
    setCreatorFormOpen(true)
  }

  const saveCreator = (event) => {
    event.preventDefault()

    const name = creatorForm.name.trim()
    if (!name) {
      notify('error', 'يرجى كتابة اسم صانع المحتوى أولاً.')
      return
    }

    // normalize URL: if provided and missing protocol, prepend https://
    const cleanUrl = (creatorForm.url || '').trim()
    const normalizedUrl = cleanUrl && !/^https?:\/\//i.test(cleanUrl) ? `https://${cleanUrl}` : cleanUrl

    const normalizedCreator = {
      id: creatorForm.id || Date.now(),
      name,
      platform: (creatorForm.platform || 'TikTok').trim() || 'TikTok',
      followers: (creatorForm.followers || '0 Followers').trim() || '0 Followers',
      image: (creatorForm.image || '').trim(),
      url: normalizedUrl,
      visible: creatorForm.visible !== false,
      order: creatorForm.id ? creators.find((item) => item.id === creatorForm.id)?.order || creators.length + 1 : creators.length + 1
    }

    const nextCreators = creatorForm.id
      ? creators.map((item) => item.id === creatorForm.id ? normalizedCreator : item)
      : [...creators, normalizedCreator]

    if (!name || !normalizedCreator.platform || !normalizedCreator.followers) {
      notify('error', 'يرجى إكمال جميع الحقول المطلوبة قبل الحفظ.')
      return
    }

    commitData(pages, users, nextCreators, news, settings)
    addAdminActivity(
      creatorForm.id ? 'تعديل صانع محتوى' : 'إضافة صانع محتوى',
      `المستخدم ${user?.name || user?.username || 'Admin'} قام ${creatorForm.id ? 'بتعديل' : 'بإضافة'} صانع المحتوى: ${name}`,
      creatorForm.id ? 'gold' : 'green'
    )
    notify('success', creatorForm.id ? `تم تعديل بيانات صانع المحتوى: ${name}` : `تمت إضافة صانع المحتوى: ${name}`)
    setCreatorFormOpen(false)
    resetCreatorForm()
  }

  const saveStaffMember = (event) => {
    event.preventDefault()
    const name = (staffForm.name || '').trim()
    if (!name) {
      notify('error', 'يرجى كتابة اسم العضو أولاً.')
      return
    }

    const normalizedUrl = (staffForm.url || '').trim()
    const cleanUrl = normalizedUrl && !/^https?:\/\//i.test(normalizedUrl) ? `https://${normalizedUrl}` : normalizedUrl
    const safeRole = (staffForm.group || staffForm.role || 'staff').trim() || 'staff'
    const socials = String(staffForm.socialLinks || '')
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter((item) => item && /^https?:\/\//i.test(item))
      .map((url) => ({ url }))
    const normalizedMember = {
      id: staffForm.id || `staff-${Date.now()}`,
      name,
      username: (staffForm.username || staffForm.title || '').trim() || name,
      title: (staffForm.title || '').trim() || safeRole,
      role: safeRole,
      group: safeRole,
      account: (staffForm.account || '').trim(),
      socials,
      image: (staffForm.image || '').trim(),
      url: cleanUrl,
      visible: staffForm.visible !== false,
      order: staffForm.id ? staff.find((item) => item.id === staffForm.id)?.order || staff.length + 1 : staff.length + 1
    }

    const nextStaff = staffForm.id
      ? staff.map((item) => item.id === staffForm.id ? normalizedMember : item)
      : [...staff, normalizedMember]

    commitData(pages, users, creators, news, settings, shopProducts, nextStaff)
    addAdminActivity(
      staffForm.id ? 'تعديل عضو طاقم' : 'إضافة عضو طاقم',
      `المستخدم ${user?.name || user?.username || 'Admin'} قام ${staffForm.id ? 'بتعديل' : 'بإضافة'} عضو الطاقم: ${name}`,
      staffForm.id ? 'gold' : 'green'
    )
    notify('success', staffForm.id ? `تم تعديل عضو الطاقم: ${name}` : `تمت إضافة عضو الطاقم: ${name}`)
    setStaffFormOpen(false)
    resetStaffForm()
  }

  const savePage = (event) => {
    event.preventDefault()
    const name = (pageForm.name || '').trim()
    if (!name) {
      notify('error', 'يرجى كتابة اسم الصفحة أولاً.')
      return
    }

    const rawId = (String(pageForm.id || '').trim() || name).trim().toLowerCase()
    const id = rawId.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') || `custom-page-${Date.now()}`

    const existingPage = pages.find((pageItem) => pageItem.id === pageForm.id)
    const isEditing = Boolean(pageForm.id) && Boolean(existingPage)
    const conflict = pages.find((pageItem) => pageItem.id === id && (!isEditing || pageItem.id !== pageForm.id))

    if (conflict) {
      notify('error', 'هذا الرابط مستخدم بالفعل في صفحة أخرى. اختر رابطاً جديداً أو عدّل اسم الرابط.')
      return
    }

    const normalized = {
      id,
      name,
      status: pageForm.status || 'visible',
      externalUrl: (pageForm.externalUrl || '').trim(),
      order: isEditing ? existingPage.order || pages.length + 1 : pages.length + 1,
      type: resolvePageType({ id, name, type: existingPage?.type }, pages.length),
      description: ''
    }

    const nextPages = isEditing
      ? pages.map((pageItem) => pageItem.id === pageForm.id ? normalized : pageItem)
      : [...pages, normalized]

    commitData(nextPages, users, creators, news, settings, shopProducts)
    addAdminActivity(
      isEditing ? 'تعديل صفحة' : 'إضافة صفحة',
      `المستخدم ${user?.name || user?.username || 'Admin'} قام ${isEditing ? 'بتعديل' : 'بإضافة'} الصفحة: ${name}`,
      isEditing ? 'gold' : 'green'
    )
    notify('success', isEditing ? `تم تعديل الصفحة: ${name}` : `تمت إضافة الصفحة: ${name}`)
    setPageFormOpen(false)
    resetPageForm()
  }

  const resetShopForm = () => {
    setShopForm({
      id: null,
      name: '',
      price: '',
      currency: 'ر.س',
      description: '',
      link: '',
      image: '',
      image2: '',
      image3: '',
      image4: '',
      featured: false,
      features: []
    })
  }

  const openCreateShopProduct = () => {
    resetShopForm()
    setShopFormOpen(true)
  }

  const openEditShopProduct = (product) => {
    setShopForm({
      id: product.id,
      name: product.name || '',
      price: product.price || '',
      currency: product.currency || 'ر.س',
      description: product.description || '',
      link: product.link || '',
      image: product.image || '',
      image2: product.image2 || '',
      image3: product.image3 || '',
      image4: product.image4 || '',
      featured: Boolean(product.featured),
      features: Array.isArray(product.features) ? product.features.map((f) => ({ text: f.text || String(f || ''), highlight: Boolean(f.highlight) })) : []
    })
    setShopFormOpen(true)
  }

  const saveShopProduct = (event) => {
    event.preventDefault()

    const name = (shopForm.name || '').trim()
    const description = (shopForm.description || '').trim()
    const price = (shopForm.price || '').toString().trim()
    const link = (shopForm.link || '').trim()

    if (!name || !price || !description || !link) {
      notify('error', 'يرجى تعبئة اسم المنتج، السعر، الوصف ورابط الشراء.')
      return
    }

    const gallery = [shopForm.image, shopForm.image2, shopForm.image3, shopForm.image4]
      .map((item) => (item || '').trim())
      .filter(Boolean)

    const normalizedFeatures = Array.isArray(shopForm.features)
      ? shopForm.features.map((f) => ({ text: String(f?.text || '').trim(), highlight: Boolean(f?.highlight) })).filter((f) => f.text)
      : []

    const normalizedProduct = {
      id: shopForm.id || `product-${Date.now()}`,
      name,
      price,
      currency: shopForm.currency || 'ر.س',
      description,
      link,
      image: gallery[0] || '/img/DS.webp',
      image2: gallery[1] || '',
      image3: gallery[2] || '',
      image4: gallery[3] || '',
      gallery,
      featured: Boolean(shopForm.featured),
      features: normalizedFeatures
    }

    const nextProducts = shopForm.id
      ? shopProducts.map((product) => product.id === shopForm.id ? normalizedProduct : product)
      : [normalizedProduct, ...shopProducts]
    // DEBUG: log new product and next products list
    try {
      console.debug('saveShopProduct: adding/updating product', normalizedProduct.id || normalizedProduct.name, 'nextProducts length', Array.isArray(nextProducts) ? nextProducts.length : 'na')
    } catch (e) {}

    commitData(pages, users, creators, news, settings, nextProducts)
    addAdminActivity(
      shopForm.id ? 'تعديل منتج' : 'إضافة منتج',
      `المستخدم ${user?.name || user?.username || 'Admin'} قام ${shopForm.id ? 'بتعديل' : 'بإضافة'} المنتج: ${name}`,
      shopForm.id ? 'gold' : 'green'
    )
    notify('success', shopForm.id ? `تم تعديل المنتج: ${name}` : `تمت إضافة المنتج: ${name}`)
    setShopFormOpen(false)
    resetShopForm()
  }

  const deleteShopProduct = (id) => {
    const product = shopProducts.find((item) => item.id === id)
    const nextProducts = shopProducts.filter((productItem) => productItem.id !== id)
    commitData(pages, users, creators, news, settings, nextProducts)
    addAdminActivity('حذف منتج', `المستخدم ${user?.name || user?.username || 'Admin'} قام بحذف المنتج: ${product?.name || 'غير معروف'}`, 'pink')
    notify('success', 'تم حذف المنتج بنجاح.')
  }

  const toggleCreator = (id) => {
    const creator = creators.find((item) => item.id === id)
    const nextVisible = creator?.visible === false
    const nextCreators = creators.map((creatorItem) => creatorItem.id === id ? { ...creatorItem, visible: nextVisible } : creatorItem)
    commitData(pages, users, nextCreators, news, settings)
    addAdminActivity(nextVisible ? 'إظهار صانع محتوى' : 'إخفاء صانع محتوى', `المستخدم ${user?.name || user?.username || 'Admin'} قام ${nextVisible ? 'بإظهار' : 'بإخفاء'} صانع المحتوى: ${creator?.name || 'غير معروف'}`, nextVisible ? 'green' : 'pink')
    notify('success', 'تم تحديث حالة صانع المحتوى بنجاح.')
  }

  const deleteCreator = (id) => {
    const creator = creators.find((item) => item.id === id)
    const nextCreators = creators.filter((creatorItem) => creatorItem.id !== id)
    commitData(pages, users, nextCreators, news, settings)
    addAdminActivity('حذف صانع محتوى', `المستخدم ${user?.name || user?.username || 'Admin'} قام بحذف صانع المحتوى: ${creator?.name || 'غير معروف'}`, 'pink')
    notify('success', 'تم حذف صانع المحتوى بنجاح.')
  }

  const toggleStaffMember = (id) => {
    const member = staff.find((item) => item.id === id)
    const nextVisible = member?.visible === false
    const nextStaff = staff.map((item) => item.id === id ? { ...item, visible: nextVisible } : item)
    commitData(pages, users, creators, news, settings, shopProducts, nextStaff)
    addAdminActivity(nextVisible ? 'إظهار عضو طاقم' : 'إخفاء عضو طاقم', `المستخدم ${user?.name || user?.username || 'Admin'} قام ${nextVisible ? 'بإظهار' : 'بإخفاء'} عضو الطاقم: ${member?.name || 'غير معروف'}`, nextVisible ? 'green' : 'pink')
    notify('success', 'تم تحديث حالة عضو الطاقم بنجاح.')
  }

  const deleteStaffMember = (id) => {
    const member = staff.find((item) => item.id === id)
    const nextStaff = staff.filter((item) => item.id !== id)
    commitData(pages, users, creators, news, settings, shopProducts, nextStaff)
    addAdminActivity('حذف عضو طاقم', `المستخدم ${user?.name || user?.username || 'Admin'} قام بحذف عضو الطاقم: ${member?.name || 'غير معروف'}`, 'pink')
    notify('success', 'تم حذف عضو الطاقم بنجاح.')
  }

  const movePage = (id, direction) => {
    const index = pages.findIndex((p) => p.id === id)
    if (index < 0) return

    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= pages.length) return

    const nextPages = [...pages]
    const [item] = nextPages.splice(index, 1)
    nextPages.splice(nextIndex, 0, item)
    const reordered = nextPages.map((page, orderIndex) => ({ ...page, order: orderIndex + 1 }))
    commitData(reordered, users, creators, news, settings)
    addAdminActivity('تغيير ترتيب الصفحات', `المستخدم ${user?.name || user?.username || 'Admin'} قام بتغيير ترتيب الصفحة: ${item?.name || 'غير معروف'}`, 'blue')
    notify('success', 'تم تغيير ترتيب الصفحات بنجاح.')
  }

  const moveCreator = (id, direction) => {
    const index = creators.findIndex((creator) => creator.id === id)
    if (index < 0) return

    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= creators.length) return

    const nextCreators = [...creators]
    const [item] = nextCreators.splice(index, 1)
    nextCreators.splice(nextIndex, 0, item)
    const reordered = nextCreators.map((creator, orderIndex) => ({ ...creator, order: orderIndex + 1 }))
    commitData(pages, users, reordered, news, settings)
    addAdminActivity('تغيير ترتيب صانعي المحتوى', `المستخدم ${user?.name || user?.username || 'Admin'} قام بتغيير ترتيب صانع المحتوى: ${item?.name || 'غير معروف'}`, 'blue')
    notify('success', 'تم تغيير ترتيب صانعي المحتوى بنجاح.')
  }

  const moveStaffMember = (id, direction) => {
    const index = staff.findIndex((member) => member.id === id)
    if (index < 0) return

    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= staff.length) return

    const nextStaff = [...staff]
    const [item] = nextStaff.splice(index, 1)
    nextStaff.splice(nextIndex, 0, item)
    const reordered = nextStaff.map((member, orderIndex) => ({ ...member, order: orderIndex + 1 }))
    commitData(pages, users, creators, news, settings, shopProducts, reordered)
    addAdminActivity('تغيير ترتيب الطاقم', `المستخدم ${user?.name || user?.username || 'Admin'} قام بتغيير ترتيب عضو الطاقم: ${item?.name || 'غير معروف'}`, 'blue')
    notify('success', 'تم تغيير ترتيب الطاقم الإداري بنجاح.')
  }

  const moveProduct = (id, direction) => {
    const index = shopProducts.findIndex((p) => p.id === id)
    if (index < 0) return

    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= shopProducts.length) return

    const nextProducts = [...shopProducts]
    const [item] = nextProducts.splice(index, 1)
    nextProducts.splice(nextIndex, 0, item)
    const reordered = nextProducts.map((prod, orderIndex) => ({ ...prod, order: orderIndex + 1 }))
    commitData(pages, users, creators, news, settings, reordered)
    addAdminActivity('تغيير ترتيب المنتجات', `المستخدم ${user?.name || user?.username || 'Admin'} قام بتغيير ترتيب المنتج: ${item?.name || 'غير معروف'}`, 'blue')
    notify('success', 'تم تغيير ترتيب المنتجات بنجاح.')
  }

  const parseFooterLinks = (rawValue) => {
    const text = (rawValue || '').toString().trim()
    if (!text) return []

    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, href = '#'] = line.split('|').map((part) => part.trim())
        if (!label) return null
        return { label, href, external: /^https?:\/\//i.test(href) }
      })
      .filter(Boolean)
  }

  const parseFooterSocials = (rawValue) => {
    const text = (rawValue || '').toString().trim()
    if (!text) return []

    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const cleanLine = line.includes('|') ? line.split('|')[0].trim() : line.trim()
        if (!cleanLine) return null
        return cleanLine
      })
      .filter(Boolean)
  }

  const saveSettings = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const nextSettings = {
      siteName: formData.get('siteName') || 'DETROIT STATE',
      discordLink: formData.get('discordLink') || 'https://discord.gg/DSRP',
      storeLink: formData.get('storeLink') || 'https://detroit-state-rp.tebex.io/',
      title: formData.get('title') || 'RP Community',
      footerLogo: formData.get('footerLogo') || '/img/DS.webp',
      footerTitle: formData.get('footerTitle') || 'DETROIT STATE',
      footerDescription: formData.get('footerDescription') || 'مجتمعنا هو مكان للعب والمرح والتفاعل مع المجتمع، حيث نلتقي للعب، والتنافس، وتبادل الخبرات داخل بيئة نظيفة واحترافية.',
      footerCopyright: formData.get('footerCopyright') || `${formData.get('siteName') || 'Detroit State'} Community. All rights reserved 2026`,
      footerQuickLinks: parseFooterLinks(formData.get('footerQuickLinks')),
      footerSocials: parseFooterSocials(formData.get('footerSocials')),
      quizTimeoutMinutes: (() => {
        const value = Number(formData.get('quizTimeoutMinutes'))
        return Number.isFinite(value) && value > 0 ? value : (settings?.quizTimeoutMinutes || 5)
      })()
    }

    commitData(pages, users, creators, news, nextSettings)
    addAdminActivity('تعديل إعدادات الموقع', `المستخدم ${user?.name || user?.username || 'Admin'} قام بتعديل إعدادات الموقع`, 'blue')
    notify('success', 'تم حفظ إعدادات الموقع بنجاح.')
  }

  const [newsForm, setNewsForm] = useState({ id: null, title: '', summary: '', content: '', image: '', date: new Date().toISOString(), visible: true })
  const [newsFormOpen, setNewsFormOpen] = useState(false)

  const resetNewsForm = () => {
    setNewsForm({ id: null, title: '', summary: '', content: '', image: '', date: new Date().toISOString(), visible: true })
  }

  const saveNews = (event) => {
    event.preventDefault()
    const title = (newsForm.title || '').trim()
    const summary = (newsForm.summary || '').trim() || (newsForm.content || '').trim()
    const content = (newsForm.content || '').trim() || summary
    if (!title || !content) {
      notify('error', 'يرجى كتابة عنوان الخبر ومحتواه قبل الحفظ.')
      return
    }

    const matchedAuthorUser = Array.isArray(users)
      ? users.find((userItem) => String(userItem.id) === String(user?.id))
      : null

    const authorName = user?.name || user?.username || matchedAuthorUser?.name || matchedAuthorUser?.username || 'Admin'
    const authorAvatar = user?.avatar || matchedAuthorUser?.avatar || '/img/DS.webp'

    const normalizedNews = {
      id: newsForm.id || `news-${Date.now()}`,
      title,
      summary: summary || content,
      content,
      image: (newsForm.image || '').trim() || '/img/DS.webp',
      date: newsForm.date || new Date().toISOString(),
      visible: newsForm.visible !== false,
      authorName,
      authorAvatar,
      authorRole: 'تمت إضافة بواسطة'
    }

    const nextNews = newsForm.id
      ? news.map((item) => item.id === newsForm.id ? normalizedNews : item)
      : [normalizedNews, ...news]

    const isEditing = Boolean(newsForm.id)
    const detailedActivityText = isEditing
      ? `المستخدم ${authorName} قام بتعديل الخبر: ${title}`
      : `المستخدم ${authorName} قام بإضافة خبر جديد: ${title}`

    commitData(pages, users, creators, nextNews, settings)
    if (onActivityAdd) {
      onActivityAdd({
        id: `news-activity-${Date.now()}`,
        user: authorName,
        avatar: authorAvatar,
        action: isEditing ? 'تعديل خبر' : 'إضافة خبر',
        detail: detailedActivityText,
        color: isEditing ? 'gold' : 'green',
        time: new Date().toISOString()
      })
    }
    notify('success', isEditing ? 'تم تعديل الخبر بنجاح.' : 'تمت إضافة الخبر بنجاح.')
    setNewsFormOpen(false)
    resetNewsForm()
  }

  const deleteNewsItem = (id) => {
    if (!isOwner) {
      notify('error', 'لا توجد صلاحية حذف الأخبار إلا لصاحب الموقع.')
      return
    }

    const itemToDelete = news.find((item) => item.id === id)
    const nextNews = news.filter((item) => item.id !== id)
    commitData(pages, users, creators, nextNews, settings)
    if (onActivityAdd && itemToDelete) {
      onActivityAdd({
        id: `news-delete-${Date.now()}`,
        user: user?.name || user?.username || 'Admin',
        avatar: user?.avatar || '/img/DS.webp',
        action: 'حذف خبر',
        detail: `المستخدم ${user?.name || user?.username || 'Admin'} قام بحذف الخبر: ${itemToDelete.title}`,
        color: 'pink',
        time: new Date().toISOString()
      })
    }
    notify('success', 'تم حذف الخبر بنجاح.')
  }

  const toggleNewsItem = (id) => {
    const item = news.find((entry) => entry.id === id)
    const nextVisible = item?.visible === false
    const nextNews = news.map((entry) => entry.id === id ? { ...entry, visible: nextVisible } : entry)
    commitData(pages, users, creators, nextNews, settings)
    addAdminActivity(nextVisible ? 'إظهار خبر' : 'إخفاء خبر', `المستخدم ${user?.name || user?.username || 'Admin'} قام ${nextVisible ? 'بإظهار' : 'بإخفاء'} الخبر: ${item?.title || 'غير معروف'}`, nextVisible ? 'green' : 'pink')
    notify('success', 'تم تحديث حالة الخبر بنجاح.')
  }

  const confirmDelete = () => {
    if (!pendingDelete) return

    if (pendingDelete.type === 'page') {
      deletePage(pendingDelete.id)
    } else if (pendingDelete.type === 'user') {
      deleteUser(pendingDelete.id)
    } else if (pendingDelete.type === 'creator') {
      deleteCreator(pendingDelete.id)
    } else if (pendingDelete.type === 'staff') {
      deleteStaffMember(pendingDelete.id)
    } else if (pendingDelete.type === 'news') {
      deleteNewsItem(pendingDelete.id)
    } else if (pendingDelete.type === 'product') {
      deleteShopProduct(pendingDelete.id)
    } else if (pendingDelete.type === 'faq-group') {
      deleteFaqGroup(pendingDelete.id)
    } else if (pendingDelete.type === 'faq-item') {
      deleteFaqItem(pendingDelete.groupId, pendingDelete.id)
    } else if (pendingDelete.type === 'quiz-question') {
      deleteQuizQuestion(pendingDelete.index)
    } else if (pendingDelete.type === 'quiz-result') {
      deleteQuizResult(pendingDelete.id)
    }

    setPendingDelete(null)
  }

  const handleConfirmDelete = async () => {
    if (!activityDeleteConfirm) return

    if (activityDeleteConfirm.type === 'all') {
      if (typeof onDeleteAllActivities === 'function') {
        await onDeleteAllActivities()
      }
    } else if (activityDeleteConfirm.type === 'single' && activityDeleteConfirm.id) {
      if (typeof onActivityDelete === 'function') {
        await onActivityDelete(activityDeleteConfirm.id)
      }
    }

    setActivityDeleteConfirm(null)
  }

  return (
    <div className="admin-panel-shell">
      <button
        type="button"
        className="admin-mobile-toggle"
        aria-label="فتح قائمة الإدارة"
        aria-expanded={mobileSidebarOpen}
        onClick={() => setMobileSidebarOpen((open) => !open)}
      >
        ☰
      </button>

      <aside className={mobileSidebarOpen ? 'admin-sidebar open' : 'admin-sidebar'}>
        <div className="admin-brand">
          <span className="brand-mark">
            <img src="/img/DS.webp" alt="DS logo" />
          </span>
          <div>
            <strong>{settings.siteName || 'DETROIT STATE'}</strong>
            <small>{currentUserRole}</small>
          </div>
        </div>

        <nav className="admin-nav">
          {[
            ['dashboard', 'لوحة التحكم'],
            ['pages', 'صفحات الموقع'],
            ['faq', 'الأسئلة الشائعة'],
            ['quiz', 'الأختبار الإلكتروني'],
            ['quiz-results', 'نتائج الأختبار الإلكتروني'],
            ['shop', 'المتجر'],
            ['users', 'الحسابات'],
            ['creators', 'صناع المحتوى'],
            ['staff', 'الطاقم الإداري'],
            ['news', 'اخبار الموقع'],
            ['activities', 'كل أنشطة (السجلات)'],
            ['settings', 'الأعدادات الموقع']
          ]
            .filter(([key]) => allowedTabs.includes(key))
            .map(([key, label]) => (
              <button
                key={key}
                className={selectedTab === key ? 'admin-nav-item active' : 'admin-nav-item'}
                onClick={() => {
                  setSelectedTab(key)
                  setMobileSidebarOpen(false)
                }}
                type="button"
              >
                {label}
              </button>
            ))}
        </nav>

        <button
          type="button"
          className="logout-btn return-home-btn"
          onClick={() => window.location.href = '/'}
        >
          العودة للموقع
        </button>
        <button type="button" className="logout-btn" onClick={onLogout}>تسجيل الخروج</button>
      </aside>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="admin-mobile-backdrop"
          aria-label="إغلاق قائمة الإدارة"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {activityDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setActivityDeleteConfirm(null)}>
          <div className="delete-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="delete-confirm-icon">!</div>
            <h4>{activityDeleteConfirm.title}</h4>
            <p>{activityDeleteConfirm.message}</p>
            <div className="delete-confirm-actions">
              <button type="button" className="mini-btn danger" onClick={handleConfirmDelete}>تأكيد الحذف</button>
              <button type="button" className="mini-btn" onClick={() => setActivityDeleteConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">مرحباً</p>
            <h2>{user?.name || 'Admin'}</h2>
          </div>
          <div className="admin-status">{currentUserRole}</div>
        </header>

        <div className={`notice-box ${notice.type}`}>{notice.text}</div>

        {pendingDelete && (
          <div className="delete-confirm-overlay" onClick={() => setPendingDelete(null)}>
            <div className="delete-confirm-modal" onClick={(event) => event.stopPropagation()}>
              <div className="delete-confirm-icon">!</div>
              <h4>هل أنت متأكد؟</h4>
              <p>
                سيتم حذف <strong>{pendingDelete.name}</strong> من {
                  pendingDelete.type === 'page' ? 'الصفحات'
                  : pendingDelete.type === 'user' ? 'الحسابات'
                  : pendingDelete.type === 'creator' ? 'صناع المحتوى'
                  : pendingDelete.type === 'news' ? 'الأخبار'
                  : pendingDelete.type === 'product' ? 'المتجر'
                  : pendingDelete.type === 'staff' ? 'الطاقم الإداري'
                  : pendingDelete.type === 'faq-group' ? 'الأسئلة الشائعة'
                  : pendingDelete.type === 'faq-item' ? 'أسئلة القسم'
                  : pendingDelete.type === 'quiz-question' ? 'أسئلة الاختبار'
                  : pendingDelete.type === 'quiz-result' ? 'نتائج الاختبار'
                  : 'المحتوى'
                }.
              </p>
              <div className="delete-confirm-actions">
                <button type="button" className="mini-btn danger" onClick={confirmDelete}>تأكيد الحذف</button>
                <button type="button" className="mini-btn" onClick={() => setPendingDelete(null)}>إلغاء</button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'dashboard' && (
          <div className="admin-dashboard-shell">
            <div className="dashboard-banner">
              <span className="dashboard-banner-text">مرحبا بعودتك! </span>
              <strong>{user?.name || 'Dreko8u'}</strong>
            </div>

            <div className="dashboard-metrics">
              <div className="metric-card accent-orange">
                <div className="metric-copy">
                  <span>أعضاء الديسكورد</span>
                  <div className="metric-row">
                    <strong>{dashboardStats.members || users.length || 0}</strong>
                    <div className="metric-badge-icon" aria-label="DS badge">
                      <img src="/img/badge1.png" alt="DS badge" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="metric-card accent-blue">
                <div className="metric-copy">
                  <span>المتصلين الآن</span>
                  <div className="metric-row">
                    <strong>{dashboardStats.onlinePlayers || 0}</strong>
                    <div className="metric-badge-icon metric-badge-online" aria-label="Online players badge">
                      <img src="/img/badge4.png" alt="Online players badge" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="metric-card accent-cyan">
                <div className="metric-copy">
                  <span>صناع المحتوى</span>
                  <div className="metric-row">
                    <strong>{dashboardStats.supportTickets || creators.length || 0}</strong>
                    <div className="metric-message-badge" aria-label="Creators badge">
                      <img src="/img/badge3.png" alt="Creators badge" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="metric-card accent-purple">
                <div className="metric-copy">
                  <span>المسجلين في الموقع</span>
                  <div className="metric-row">
                    <strong>{dashboardStats.registeredUsers || users.length || 0}</strong>
                    <div className="metric-badge-icon metric-badge-registered" aria-label="Registered users badge">
                      <img src="/img/badge2.png" alt="Registered users badge" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-lower-grid">
              <div className="activity-panel">
                <div className="panel-heading">
                  <h4>آخر الأنشطة</h4>
                  <button type="button" className="mini-btn" onClick={openActivityFeed}>عرض كل الأنشطة</button>
                </div>

                <ul className="activity-list">
                  {recentActivity.map((entry) => (
                    <li key={entry.id}>
                      <div className="activity-user">
                        {entry.avatar ? (
                          <img src={entry.avatar} alt={entry.name} className="activity-avatar-image" />
                        ) : (
                          <span className={`activity-avatar avatar-${entry.color}`}>{entry.name.charAt(0).toUpperCase()}</span>
                        )}
                        <div>
                          <strong>{entry.name}</strong>
                          <small>{entry.time}</small>
                        </div>
                      </div>
                      <span className={`activity-tag ${entry.color || 'blue'}`}>{entry.role}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="chart-panel">
                <div className="panel-heading">
                  <h4>المستخدمون الجدد خلال 7 أيام</h4>
                  <button type="button" className="mini-btn">مؤشرات</button>
                </div>
                <div className="chart-wrap" onMouseLeave={() => setChartHover({ active: false, index: 0, value: 0, label: '' })}>
                  <svg viewBox="0 0 560 220" preserveAspectRatio="none" className="admin-chart" role="img" aria-label="Chart of new users over 7 days">
                    <defs>
                      <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(54, 255, 183, 0.55)" />
                        <stop offset="100%" stopColor="rgba(54, 255, 183, 0.05)" />
                      </linearGradient>
                    </defs>
                    <g className="chart-grid-lines">
                      <line x1="0" x2="560" y1="180" y2="180" />
                      <line x1="0" x2="560" y1="120" y2="120" />
                      <line x1="0" x2="560" y1="60" y2="60" />
                    </g>
                    {chartSeries.map((point, index) => {
                      const x = 40 + (index * 80)
                      const y = 180 - (point.value * 10)
                      return (
                        <g key={point.label}>
                          <circle
                            cx={x}
                            cy={y}
                            r={chartHover.index === index ? 6 : 4}
                            fill="#6ef7c7"
                            stroke="rgba(15, 23, 42, 0.9)"
                            strokeWidth="2"
                            onMouseEnter={() => setChartHover({ active: true, index, value: point.value, label: point.label })}
                            onMouseMove={(event) => {
                              const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect()
                              const offsetX = event.clientX - rect.left
                              const targetIndex = Math.min(chartSeries.length - 1, Math.max(0, Math.round((offsetX / rect.width) * (chartSeries.length - 1))))
                              setChartHover({ active: true, index: targetIndex, value: chartSeries[targetIndex].value, label: chartSeries[targetIndex].label })
                            }}
                          />
                        </g>
                      )
                    })}
                    <path d={`M40 ${180 - (chartPoints[0] * 10)} C100 ${180 - (chartPoints[1] * 10)}, 150 ${180 - (chartPoints[2] * 10)}, 200 ${180 - (chartPoints[3] * 10)} S280 ${180 - (chartPoints[4] * 10)}, 340 ${180 - (chartPoints[5] * 10)} S450 ${180 - (chartPoints[6] * 10)}, 520 ${180 - (chartPoints[6] * 10)} L520 180 L40 180 Z`} fill="url(#chartFill)" opacity="0.9" />
                    <path d={`M40 ${180 - (chartPoints[0] * 10)} C100 ${180 - (chartPoints[1] * 10)}, 150 ${180 - (chartPoints[2] * 10)}, 200 ${180 - (chartPoints[3] * 10)} S280 ${180 - (chartPoints[4] * 10)}, 340 ${180 - (chartPoints[5] * 10)} S450 ${180 - (chartPoints[6] * 10)}, 520 ${180 - (chartPoints[6] * 10)}`} fill="none" stroke="#41f0b1" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  {chartHover.active && (
                    <div className="chart-tooltip">
                      <strong>{chartSeries[chartHover.index]?.label}</strong>
                      <span>{chartHover.value} تسجيل دخول</span>
                    </div>
                  )}
                </div>
                <div className="chart-labels">
                  {chartSeries.map((point) => (
                    <span key={point.label}>{point.label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="quick-actions-panel">
              <div className="panel-heading">
                <h4>إجراءات سريعة</h4>
              </div>
              <div className="quick-actions-grid">
                <button type="button" className="action-card">
                  <span>⚙</span>
                  <strong>إدارة السيرفر</strong>
                </button>
                <button type="button" className="action-card">
                  <span>◫</span>
                  <strong>الملفات</strong>
                </button>
                <button type="button" className="action-card">
                  <span>☰</span>
                  <strong>التقارير</strong>
                </button>
                <button type="button" className="action-card">
                  <span>◎</span>
                  <strong>المتصلين</strong>
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'pages' && (
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>إدارة الصفحات</h3>
              <div>
                <button type="button" className="mini-btn" onClick={openCreatePage}>+ صفحة جديدة</button>
              </div>
            </div>

            {pageFormOpen && (
              <form className="page-editor" onSubmit={savePage}>
                <div className="creator-editor-header">
                  <h4>{pageForm.id ? 'تعديل الصفحة' : 'إضافة صفحة جديدة'}</h4>
                  <button type="button" className="mini-btn" onClick={() => { setPageFormOpen(false); resetPageForm() }}>إغلاق</button>
                </div>

                <div className="creator-form-grid">
                  <label className="creator-field">
                    <span>اسم الصفحة</span>
                    <input
                      type="text"
                      value={pageForm.name}
                      onChange={(event) => setPageForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="مثال: الأخبار"
                    />
                  </label>

                  <label className="creator-field">
                    <span>الرابط الإنجليزي (slug)</span>
                    <input
                      type="text"
                      value={pageForm.id || ''}
                      onChange={(event) => setPageForm((current) => ({ ...current, id: event.target.value }))}
                      placeholder="مثال: news"
                    />
                  </label>

                  <label className="creator-field">
                    <span>رابط خارجي (اختياري)</span>
                    <input
                      type="url"
                      value={pageForm.externalUrl}
                      onChange={(event) => setPageForm((current) => ({ ...current, externalUrl: event.target.value }))}
                      placeholder="https://example.com/page"
                    />
                  </label>
                </div>

                <label className="creator-checkbox">
                  <input
                    type="checkbox"
                    checked={pageForm.status !== 'hidden'}
                    onChange={(event) => setPageForm((current) => ({ ...current, status: event.target.checked ? 'visible' : 'hidden' }))}
                  />
                  <span>مرئية في النافبار</span>
                </label>

                <div className="creator-form-actions">
                  <button type="submit" className="mini-btn">{pageForm.id ? 'حفظ التعديل' : 'إضافة الآن'}</button>
                  <button type="button" className="mini-btn danger" onClick={() => { setPageFormOpen(false); resetPageForm() }}>إلغاء</button>
                </div>
              </form>
            )}

            <div className="list-table">
              {pages.map((page, idx) => (
                <div key={page.id} className="list-row">
                  <div>
                    <strong>{page.name}</strong>
                    <small>{page.status === 'visible' ? 'مرئية' : 'مخفية'}{page.externalUrl ? ` • External` : ''}</small>
                    {page.externalUrl && <div><small><a href={page.externalUrl} target="_blank" rel="noreferrer">رابط خارجي</a></small></div>}
                  </div>
                  <div className="row-actions">
                    <button type="button" className="mini-btn" onClick={() => openEditPage(page)}>تعديل</button>
                    <button type="button" className="mini-btn" onClick={() => togglePage(page.id)}>{page.status === 'visible' ? 'إخفاء' : 'إظهار'}</button>
                    <button type="button" className="mini-btn" onClick={() => movePage(page.id, 'up')}>↑</button>
                    <button type="button" className="mini-btn" onClick={() => movePage(page.id, 'down')}>↓</button>
                    <button type="button" className="mini-btn danger" onClick={() => setPendingDelete({ type: 'page', id: page.id, name: page.name })}>حذف</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'quiz' && (
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>إدارة اختبار Detroit State</h3>
              <button type="button" className="mini-btn primary" onClick={saveQuizDraft}>حفظ</button>
            </div>

            <div className="settings-grid" style={{ marginBottom: '1rem' }}>
              <label>
                <span>مدة الاختبار (دقائق)</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={quizTimeoutMinutesDraft}
                  onChange={(event) => setQuizTimeoutMinutesDraft(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
            </div>

            <div className="faq-admin-groups">
              {(quizDraftQuestions || []).map((question, questionIndex) => (
                <div key={question.id || `quiz-question-${questionIndex}`} className="faq-admin-group">
                  <div className="faq-admin-header">
                    <input
                      type="text"
                      value={question.question}
                      onChange={(event) => {
                        const nextQuestions = quizDraftQuestions.map((item, index) => index === questionIndex ? { ...item, question: event.target.value } : item)
                        setQuizDraftQuestions(nextQuestions)
                      }}
                      placeholder="نص السؤال"
                    />
                    <div className="row-actions">
                      <button type="button" className="mini-btn" onClick={() => {
                        const nextQuestions = [...quizDraftQuestions]
                        const [selected] = nextQuestions.splice(questionIndex, 1)
                        nextQuestions.splice(Math.max(0, questionIndex - 1), 0, selected)
                        setQuizDraftQuestions(nextQuestions)
                      }} disabled={questionIndex === 0}>↑</button>
                      <button type="button" className="mini-btn" onClick={() => {
                        const nextQuestions = [...quizDraftQuestions]
                        const [selected] = nextQuestions.splice(questionIndex, 1)
                        nextQuestions.splice(Math.min(nextQuestions.length, questionIndex + 1), 0, selected)
                        setQuizDraftQuestions(nextQuestions)
                      }} disabled={questionIndex === quizDraftQuestions.length - 1}>↓</button>
                      <button type="button" className="mini-btn danger" onClick={() => setPendingDelete({ type: 'quiz-question', index: questionIndex, name: question.question || `السؤال ${questionIndex + 1}` })}>حذف</button>
                    </div>
                  </div>

                  <div className="faq-admin-items">
                    {(question.options || []).map((option, optionIndex) => (
                      <div key={`${question.id}-option-${optionIndex}`} className="faq-admin-item">
                        <input
                          type="text"
                          value={option}
                          onChange={(event) => {
                            const nextQuestions = quizDraftQuestions.map((item, index) => index === questionIndex ? {
                              ...item,
                              options: (item.options || []).map((choice, choiceIndex) => choiceIndex === optionIndex ? event.target.value : choice)
                            } : item)
                            setQuizDraftQuestions(nextQuestions)
                          }}
                          placeholder={`الخيار ${optionIndex + 1}`}
                        />
                        <label className="mini-checkbox">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={Number(question.correctIndex) === optionIndex}
                            onChange={() => {
                              const nextQuestions = quizDraftQuestions.map((item, index) => index === questionIndex ? { ...item, correctIndex: optionIndex } : item)
                              setQuizDraftQuestions(nextQuestions)
                            }}
                          />
                          <span>إجابة صحيحة</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="row-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="mini-btn" onClick={() => {
                const nextQuestions = [...quizDraftQuestions, {
                  id: `quiz-q-${Date.now()}`,
                  question: 'سؤال جديد',
                  options: ['خيار 1', 'خيار 2', 'خيار 3', 'خيار 4'],
                  correctIndex: 0
                }]
                setQuizDraftQuestions(nextQuestions)
              }}>+ إضافة سؤال</button>
            </div>
          </div>
        )}

        {selectedTab === 'quiz-results' && (
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>نتائج الأختبار الإلكتروني</h3>
            </div>

            <div className="panel-search" style={{ marginBottom: '1rem' }}>
              <span className="panel-search-icon">⌕</span>
              <input
                type="search"
                value={quizResultsSearch}
                onChange={(event) => setQuizResultsSearch(event.target.value)}
                placeholder="بحث في النتائج: الاسم، النتيجة، الحالة، التاريخ..."
                aria-label="بحث في نتائج الاختبار"
              />
            </div>

            <div className="faq-admin-items">
              {(filteredQuizResults || []).length === 0 && (
                <div className="faq-admin-item" style={{ padding: '1rem' }}>
                  <p>{quizResultsSearch ? 'لا توجد نتائج مطابقة للبحث.' : 'لا توجد نتائج بعد.'}</p>
                </div>
              )}

              {(filteredQuizResults || []).map((result) => {
                const avatar = result.avatar || '/img/DS.webp'

                return (
                  <div key={result.id} className="faq-admin-item" style={{ padding: '1rem' }}>
                    <div className="panel-title-row" style={{ alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img src={avatar} alt={result.userName || 'user'} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <strong>{result.userName || 'مستخدم'}</strong>
                          <small style={{ display: 'block' }}>الدرجة: {result.score || 0}/{result.total || 0} • {result.passed ? 'نجح' : 'لم ينجح'}</small>
                        </div>
                      </div>
                      <div className="row-actions">
                        <button type="button" className="mini-btn" onClick={() => setExpandedResultId(expandedResultId === result.id ? null : result.id)}>تفاصيل</button>
                        {result.cheatAttempt && (
                          <span style={{ color: '#ffd6d6', fontWeight: 700, fontSize: '0.78rem' }}>حاول الغش</span>
                        )}
                        {(result.passed || result.reviewed || result.roleGranted) && (currentUserRole === 'Owner' || currentUserRole === 'Admin' || currentUserRole === 'Mod') && (
                          <>
                            <button type="button" className="mini-btn primary" onClick={() => awardQuizRole(result)} disabled={Boolean(result.reviewed || result.roleGranted)}>
                              {result.reviewed || result.roleGranted ? 'تم المنح' : 'منح الرتبة'}
                            </button>
                            <button type="button" className="mini-btn danger" onClick={() => revokeQuizRole(result)} disabled={Boolean(!result.reviewed && !result.roleGranted)}>
                              سحب رتبة ناجح
                            </button>
                          </>
                        )}
                        {isOwner && (
                          <button type="button" className="mini-btn danger" onClick={() => setPendingDelete({ type: 'quiz-result', id: result.id, name: result.userName || 'نتيجة الاختبار' })}>حذف</button>
                        )}
                      </div>
                    </div>

                    {expandedResultId === result.id && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <p><strong>تاريخ الإرسال:</strong> {formatQuizResultDate(result.submittedAt || Date.now())}</p>
                        {result.cheatAttempt && (
                          <p style={{ margin: '0.25rem 0', color: '#ffd6d6', fontWeight: 700 }}>ملاحظة: هذا الشخص حاول الغش أو ترك الاختبار قبل الانتهاء.</p>
                        )}
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                          {(quizQuestions || []).map((question, index) => {
                            const answerIndex = Number(result.answers?.[question.id])
                            const selectedOption = Array.isArray(question.options) ? question.options[answerIndex] : 'لا توجد إجابة'
                            const correctIndex = Number(question.correctIndex)
                            const correctOption = Array.isArray(question.options) ? question.options[correctIndex] : '—'
                            const isCorrect = answerIndex === correctIndex

                            return (
                              <div key={`${result.id}-${question.id || index}`} style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>{index + 1}. {question.question || 'سؤال'}</p>
                                <p style={{ margin: '0.15rem 0', color: isCorrect ? '#7ee7a8' : '#ffd3d3' }}>
                                  الإجابة المختارة: {selectedOption}
                                </p>
                                <p style={{ margin: '0.15rem 0', color: '#d8d9ff' }}>
                                  الإجابة الصحيحة: {correctOption}
                                </p>
                                <small style={{ color: isCorrect ? '#7ee7a8' : '#ffd3d3' }}>
                                  {isCorrect ? 'إجابة صحيحة' : 'إجابة غير صحيحة'}
                                </small>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {selectedTab === 'faq' && (
          <>
            {faqGroupModalOpen && (
              <div className="faq-modal-overlay" onClick={() => setFaqGroupModalOpen(false)}>
                <div className="faq-modal-card" onClick={(event) => event.stopPropagation()}>
                  <div className="faq-modal-header">
                    <h4>إضافة قسم جديد</h4>
                    <button type="button" className="mini-btn" onClick={() => setFaqGroupModalOpen(false)}>إغلاق</button>
                  </div>

                  <form
                    className="faq-modal-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const cleanTitle = faqGroupForm.title.trim()
                      if (!cleanTitle) return

                      const nextGroups = [...faqDraftGroups, { id: `faq-group-${Date.now()}`, title: cleanTitle, items: [] }]
                      setFaqDraftGroups(nextGroups)
                      setFaqGroupForm({ title: '' })
                      setFaqGroupModalOpen(false)
                      notify('success', `تمت إضافة قسم الأسئلة: ${cleanTitle}`)
                    }}
                  >
                    <label className="faq-modal-field">
                      <span>اسم القسم</span>
                      <input
                        type="text"
                        value={faqGroupForm.title}
                        onChange={(event) => setFaqGroupForm({ title: event.target.value })}
                        placeholder="مثال: التفعيل والبدء"
                        autoFocus
                      />
                    </label>

                    <div className="faq-modal-actions">
                      <button type="button" className="mini-btn" onClick={() => setFaqGroupModalOpen(false)}>Cancel</button>
                      <button type="submit" className="mini-btn primary">OK</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="panel-card">
              <div className="panel-title-row">
                <h3>إدارة الأسئلة الشائعة</h3>
                <div className="row-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => setFaqGroupModalOpen(true)}
                  >
                    + قسم جديد
                  </button>
                  <button
                    type="button"
                    className="mini-btn primary"
                    onClick={() => {
                      setFaqGroups(faqDraftGroups)
                      commitData(pages, users, creators, news, settings, shopProducts, staff, faqDraftGroups)
                      addAdminActivity('تعديل الأسئلة الشائعة', `المستخدم ${user?.name || user?.username || 'Admin'} قام بتعديل الأسئلة الشائعة.`, 'gold')
                      notify('success', 'تم حفظ تعديلات الأسئلة بنجاح.')
                    }}
                  >
                    حفظ
                  </button>
                </div>
              </div>

              <div className="faq-admin-groups">
              {faqDraftGroups.map((group, groupIndex) => (
                <div key={group.id || `${group.title}-${groupIndex}`} className="faq-admin-group">
                  <div className="faq-admin-header">
                    <input
                      type="text"
                      value={group.title}
                      onChange={(event) => {
                        const nextGroups = faqDraftGroups.map((item) => item.id === group.id ? { ...item, title: event.target.value } : item)
                        setFaqDraftGroups(nextGroups)
                      }}
                      placeholder="عنوان القسم"
                    />
                    <div className="row-actions">
                      <button type="button" className="mini-btn" onClick={() => {
                        const nextGroups = [...faqDraftGroups]
                        const [item] = nextGroups.splice(groupIndex, 1)
                        nextGroups.splice(Math.max(0, groupIndex - 1), 0, item)
                        setFaqDraftGroups(nextGroups)
                      }} disabled={groupIndex === 0}>↑</button>
                      <button type="button" className="mini-btn" onClick={() => {
                        const nextGroups = [...faqDraftGroups]
                        const [item] = nextGroups.splice(groupIndex, 1)
                        nextGroups.splice(Math.min(nextGroups.length, groupIndex + 1), 0, item)
                        setFaqDraftGroups(nextGroups)
                      }} disabled={groupIndex === faqDraftGroups.length - 1}>↓</button>
                      <button type="button" className="mini-btn danger" onClick={() => setPendingDelete({ type: 'faq-group', id: group.id, name: group.title || 'هذا القسم' })}>حذف</button>
                    </div>
                  </div>

                  <div className="faq-admin-items">
                    {(group.items || []).map((item, itemIndex) => (
                      <div key={item.id || `${group.id}-${itemIndex}`} className="faq-admin-item">
                        <input
                          type="text"
                          value={item.question}
                          onChange={(event) => {
                            const nextGroups = faqDraftGroups.map((groupItem) => groupItem.id === group.id ? {
                              ...groupItem,
                              items: (groupItem.items || []).map((questionItem) => questionItem.id === item.id ? { ...questionItem, question: event.target.value } : questionItem)
                            } : groupItem)
                            setFaqDraftGroups(nextGroups)
                          }}
                          placeholder="سؤال"
                        />
                        <textarea
                          rows="3"
                          value={item.answer}
                          onChange={(event) => {
                            const nextGroups = faqDraftGroups.map((groupItem) => groupItem.id === group.id ? {
                              ...groupItem,
                              items: (groupItem.items || []).map((questionItem) => questionItem.id === item.id ? { ...questionItem, answer: event.target.value } : questionItem)
                            } : groupItem)
                            setFaqDraftGroups(nextGroups)
                          }}
                          placeholder="إجابة السؤال"
                        />
                        <div className="row-actions">
                          <button type="button" className="mini-btn" onClick={() => {
                            const nextGroups = faqDraftGroups.map((groupItem) => groupItem.id === group.id ? {
                              ...groupItem,
                              items: [...(groupItem.items || [])]
                            } : groupItem)
                            const items = nextGroups[groupIndex].items || []
                            const [selected] = items.splice(itemIndex, 1)
                            items.splice(Math.max(0, itemIndex - 1), 0, selected)
                            nextGroups[groupIndex] = { ...nextGroups[groupIndex], items }
                            setFaqDraftGroups(nextGroups)
                          }} disabled={itemIndex === 0}>↑</button>
                          <button type="button" className="mini-btn" onClick={() => {
                            const nextGroups = faqDraftGroups.map((groupItem) => groupItem.id === group.id ? {
                              ...groupItem,
                              items: [...(groupItem.items || [])]
                            } : groupItem)
                            const items = nextGroups[groupIndex].items || []
                            const [selected] = items.splice(itemIndex, 1)
                            items.splice(Math.min(items.length, itemIndex + 1), 0, selected)
                            nextGroups[groupIndex] = { ...nextGroups[groupIndex], items }
                            setFaqDraftGroups(nextGroups)
                          }} disabled={itemIndex === (group.items || []).length - 1}>↓</button>
                          <button type="button" className="mini-btn danger" onClick={() => setPendingDelete({ type: 'faq-item', id: item.id, groupId: group.id, name: item.question || 'هذا السؤال' })}>حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="button" className="mini-btn" onClick={() => {
                    const nextGroups = faqDraftGroups.map((groupItem) => groupItem.id === group.id ? {
                      ...groupItem,
                      items: [...(groupItem.items || []), { id: `faq-item-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, question: 'سؤال جديد', answer: 'إجابة السؤال...' }]
                    } : groupItem)
                    setFaqDraftGroups(nextGroups)
                  }}>+ إضافة سؤال</button>
                </div>
              ))}
            </div>
          </div>
          </>
        )}

        {selectedTab === 'shop' && (
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>إدارة المتجر</h3>
              <button type="button" className="mini-btn" onClick={openCreateShopProduct}>+ منتج جديد</button>
            </div>

            {shopFormOpen && (
              <form className="page-editor" onSubmit={saveShopProduct}>
                <div className="creator-editor-header">
                  <h4>{shopForm.id ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h4>
                  <button type="button" className="mini-btn" onClick={() => { setShopFormOpen(false); resetShopForm() }}>إغلاق</button>
                </div>

                <div className="creator-form-grid">
                  <label className="creator-field">
                    <span>اسم المنتج</span>
                    <input value={shopForm.name} onChange={(event) => setShopForm((current) => ({ ...current, name: event.target.value }))} placeholder="مثال: VIP" />
                  </label>

                  <label className="creator-field">
                    <span>السعر</span>
                    <input value={shopForm.price} onChange={(event) => setShopForm((current) => ({ ...current, price: event.target.value }))} placeholder="59" />
                  </label>

                  <label className="creator-field">
                    <span>العملة</span>
                    <input value={shopForm.currency} onChange={(event) => setShopForm((current) => ({ ...current, currency: event.target.value }))} placeholder="ر.س" />
                  </label>

                  <label className="creator-field creator-field-full">
                    <span>رابط الشراء</span>
                    <input type="url" value={shopForm.link} onChange={(event) => setShopForm((current) => ({ ...current, link: event.target.value }))} placeholder="https://example.com/buy" />
                  </label>

                  <label className="creator-field creator-field-full">
                    <span>وصف المنتج</span>
                    <textarea value={shopForm.description} onChange={(event) => setShopForm((current) => ({ ...current, description: event.target.value }))} placeholder="وصف مختصر للمنتج" rows={4} />
                  </label>

                  <label className="creator-field creator-field-full">
                    <span>رابط الصورة الرئيسية</span>
                    <input type="url" value={shopForm.image} onChange={(event) => setShopForm((current) => ({ ...current, image: event.target.value }))} placeholder="https://example.com/image-main.jpg" />
                  </label>

                  <label className="creator-field creator-field-full">
                    <span>رابط صورة إضافية 1 (اختياري)</span>
                    <input type="url" value={shopForm.image2} onChange={(event) => setShopForm((current) => ({ ...current, image2: event.target.value }))} placeholder="https://example.com/image-2.jpg" />
                  </label>

                  <label className="creator-field creator-field-full">
                    <span>رابط صورة إضافية 2 (اختياري)</span>
                    <input type="url" value={shopForm.image3} onChange={(event) => setShopForm((current) => ({ ...current, image3: event.target.value }))} placeholder="https://example.com/image-3.jpg" />
                  </label>

                  <label className="creator-field creator-field-full">
                    <span>رابط صورة إضافية 3 (اختياري)</span>
                    <input type="url" value={shopForm.image4} onChange={(event) => setShopForm((current) => ({ ...current, image4: event.target.value }))} placeholder="https://example.com/image-4.jpg" />
                  </label>
                  <div className="creator-field creator-field-full">
                    <span>مزايا المنتج (يمكن تمييزها باللون الأحمر)</span>
                    <div className="product-features-editor">
                      {(shopForm.features || []).map((feat, idx) => (
                        <div key={`feat-${idx}`} className="feature-edit-row">
                          <input
                            value={feat.text}
                            onChange={(event) => setShopForm((current) => ({
                              ...current,
                              features: current.features.map((f, i) => i === idx ? { ...f, text: event.target.value } : f)
                            }))}
                            placeholder={`الميزة ${idx + 1}`}
                          />
                          <label className="creator-checkbox small">
                            <input
                              type="checkbox"
                              checked={Boolean(feat.highlight)}
                              onChange={(event) => setShopForm((current) => ({
                                ...current,
                                features: current.features.map((f, i) => i === idx ? { ...f, highlight: event.target.checked } : f)
                              }))}
                            />
                            <span>اجعلها باللون الأحمر</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="creator-checkbox">
                  <input type="checkbox" checked={shopForm.featured} onChange={(event) => setShopForm((current) => ({ ...current, featured: event.target.checked }))} />
                  <span>عرضه كمنتج مميز</span>
                </label>

                <div className="creator-form-actions">
                  <button type="submit" className="mini-btn">{shopForm.id ? 'حفظ التعديل' : 'إضافة المنتج'}</button>
                  <button type="button" className="mini-btn danger" onClick={() => { setShopFormOpen(false); resetShopForm() }}>إلغاء</button>
                </div>
              </form>
            )}

                <div className="panel-search">
                  <span className="panel-search-icon">⌕</span>
                  <input
                    type="search"
                    value={shopSearch}
                    onChange={(event) => setShopSearch(event.target.value)}
                    placeholder="بحث في المنتجات: الاسم، السعر..."
                    aria-label="بحث في المنتجات"
                  />
                </div>

                <div className="list-table">
                  {shopProducts.length ? shopProducts.filter((p) => {
                    const q = (shopSearch || '').trim().toLowerCase()
                    if (!q) return true
                    return [p.name, p.price, p.currency, p.description].filter(Boolean).join(' ').toLowerCase().includes(q)
                  }).map((product) => (
                <div key={product.id} className="list-row">
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.price} {product.currency || 'ر.س'} • {product.featured ? 'مميز' : 'عادي'}</small>
                  </div>
                  <div className="row-actions">
                        <button type="button" className="mini-btn" onClick={() => openEditShopProduct(product)}>تعديل</button>
                        <button type="button" className="mini-btn" onClick={() => moveProduct(product.id, 'up')} aria-label="نقل لأعلى">↑</button>
                        <button type="button" className="mini-btn" onClick={() => moveProduct(product.id, 'down')} aria-label="نقل لأسفل">↓</button>
                        <button type="button" className="mini-btn danger" onClick={() => setPendingDelete({ type: 'product', id: product.id, name: product.name })}>حذف</button>
                  </div>
                </div>
                  )) : (
                <div className="empty-state">لا توجد منتجات في المتجر.</div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'users' && (
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>إدارة الحسابات</h3>
              <button type="button" className="mini-btn" onClick={addUser}>+ مستخدم</button>
            </div>

            <div className="panel-search">
              <span className="panel-search-icon">⌕</span>
              <input
                type="search"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="بحث في الحسابات: الاسم، البريد، الدور..."
                aria-label="بحث في الحسابات"
              />
            </div>

            <div className="list-table">
              {filteredUsers.length ? filteredUsers.map((userItem) => (
                <div key={userItem.id} className="list-row">
                  <div>
                    <strong>{userItem.name}</strong>
                    <small>{userItem.email}</small>
                  </div>
                  <div className="user-meta">
                    <select
                      value={normalizeUserRole(userItem.role)}
                      onChange={(event) => updateUserRole(userItem.id, event.target.value)}
                      aria-label={`تغيير صلاحية ${userItem.name}`}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <small>{formatLastSeen(userItem.firstLoginAt, userItem.lastSeen)}</small>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="mini-btn danger" onClick={() => setPendingDelete({ type: 'user', id: userItem.id, name: userItem.name })}>حذف</button>
                  </div>
                </div>
              )) : (
                <div className="empty-state">لا توجد نتائج مطابقة في الحسابات.</div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'creators' && (
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>إدارة صناع المحتوى</h3>
              <button type="button" className="mini-btn" onClick={openCreateCreator}>+ إضافة</button>
            </div>

            <div className="panel-search">
              <span className="panel-search-icon">⌕</span>
              <input
                type="search"
                value={creatorSearch}
                onChange={(event) => setCreatorSearch(event.target.value)}
                placeholder="بحث في صناع المحتوى: الاسم، المنصة، الرابط..."
                aria-label="بحث في صناع المحتوى"
              />
            </div>

            {creatorFormOpen && (
              <form className="creator-editor" onSubmit={saveCreator}>
                <div className="creator-editor-header">
                  <h4>{creatorForm.id ? 'تعديل صانع المحتوى' : 'إضافة صانع محتوى جديد'}</h4>
                  <button type="button" className="mini-btn" onClick={() => { setCreatorFormOpen(false); resetCreatorForm() }}>إغلاق</button>
                </div>

                <div className="creator-form-grid">
                  <label className="creator-field">
                    <span>اسم الشخص</span>
                    <input
                      type="text"
                      value={creatorForm.name}
                      onChange={(event) => setCreatorForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="مثال: Dreko"
                    />
                  </label>

                  <label className="creator-field">
                    <span>اسم المنصة</span>
                    <input
                      type="text"
                      value={creatorForm.platform}
                      onChange={(event) => setCreatorForm((current) => ({ ...current, platform: event.target.value }))}
                      placeholder="TikTok"
                    />
                  </label>

                  <label className="creator-field">
                    <span>عدد المتابعين</span>
                    <input
                      type="text"
                      value={creatorForm.followers}
                      onChange={(event) => setCreatorForm((current) => ({ ...current, followers: event.target.value }))}
                      placeholder="9000 Followers"
                    />
                  </label>

                  <label className="creator-field">
                    <span>رابط الصورة</span>
                    <input
                      type="url"
                      value={creatorForm.image}
                      onChange={(event) => setCreatorForm((current) => ({ ...current, image: event.target.value }))}
                      placeholder="https://..."
                    />
                  </label>

                    <label className="creator-field">
                      <span>رابط الحساب (URL)</span>
                      <input
                        type="url"
                        value={creatorForm.url}
                        onChange={(event) => setCreatorForm((current) => ({ ...current, url: event.target.value }))}
                        placeholder="https://tiktok.com/@username or https://youtube.com/user/..."
                      />
                    </label>
                </div>

                <label className="creator-checkbox">
                  <input
                    type="checkbox"
                    checked={creatorForm.visible !== false}
                    onChange={(event) => setCreatorForm((current) => ({ ...current, visible: event.target.checked }))}
                  />
                  <span>مرئي في الصفحة الرئيسية</span>
                </label>

                <div className="creator-form-actions">
                  <button type="submit" className="mini-btn">{creatorForm.id ? 'حفظ التعديل' : 'إضافة الآن'}</button>
                  <button type="button" className="mini-btn danger" onClick={() => { setCreatorFormOpen(false); resetCreatorForm() }}>إلغاء</button>
                </div>
              </form>
            )}

            <div className="list-table">
              {filteredCreators.length ? filteredCreators.map((creator) => (
                <div key={creator.id} className="list-row">
                  <div className="creator-item-info">
                    <div className="creator-mini-avatar" style={{ backgroundImage: creator.image ? `url(${creator.image})` : 'linear-gradient(135deg, #7c3aed, #2a6bff)' }} />
                    <div>
                      {creator.url ? (
                        <a href={creator.url} target="_blank" rel="noreferrer" className="creator-link"><strong>{creator.name}</strong></a>
                      ) : (
                        <strong>{creator.name}</strong>
                      )}
                      <small>{creator.platform} • {creator.followers}</small>
                      {creator.url && <div><small><a href={creator.url} target="_blank" rel="noreferrer">فتح الحساب</a></small></div>}
                    </div>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="mini-btn" onClick={() => openEditCreator(creator)}>تعديل</button>
                    <button type="button" className="mini-btn" onClick={() => toggleCreator(creator.id)}>{creator.visible === false ? 'إظهار' : 'إخفاء'}</button>
                    <button type="button" className="mini-btn" onClick={() => moveCreator(creator.id, 'up')}>↑</button>
                    <button type="button" className="mini-btn" onClick={() => moveCreator(creator.id, 'down')}>↓</button>
                    <button type="button" className="mini-btn danger" onClick={() => setPendingDelete({ type: 'creator', id: creator.id, name: creator.name })}>حذف</button>
                  </div>
                </div>
              )) : (
                <div className="empty-state">لا توجد نتائج مطابقة في صناع المحتوى.</div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'staff' && (
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>إدارة الطاقم الإداري</h3>
              <button type="button" className="mini-btn" onClick={openCreateStaff}>+ إضافة</button>
            </div>

            <div className="panel-search">
              <span className="panel-search-icon">⌕</span>
              <input
                type="search"
                value={creatorSearch}
                onChange={(event) => setCreatorSearch(event.target.value)}
                placeholder="بحث في الطاقم: الاسم، المنصب، الحساب..."
                aria-label="بحث في الطاقم الإداري"
              />
            </div>

            {staffFormOpen && (
              <form className="creator-editor" onSubmit={saveStaffMember}>
                <div className="creator-editor-header">
                  <h4>{staffForm.id ? 'تعديل عضو الطاقم' : 'إضافة عضو طاقم جديد'}</h4>
                  <button type="button" className="mini-btn" onClick={() => { setStaffFormOpen(false); resetStaffForm() }}>إغلاق</button>
                </div>

                <div className="creator-form-grid">
                  <label className="creator-field">
                    <span>اسم العضو</span>
                    <input type="text" value={staffForm.name} onChange={(event) => setStaffForm((current) => ({ ...current, name: event.target.value }))} placeholder="مثال: Power" />
                  </label>

                  <label className="creator-field">
                    <span>اسم الحساب / النيش</span>
                    <input type="text" value={staffForm.username} onChange={(event) => setStaffForm((current) => ({ ...current, username: event.target.value }))} placeholder="مثال: power" />
                  </label>

                  <label className="creator-field">
                    <span>المنصب</span>
                    <input type="text" value={staffForm.title} onChange={(event) => setStaffForm((current) => ({ ...current, title: event.target.value }))} placeholder="Owner / Developer / Moderator" />
                  </label>

                  <label className="creator-field">
                    <span>المجموعة</span>
                    <select value={staffForm.group || staffForm.role || 'staff'} onChange={(event) => setStaffForm((current) => ({ ...current, role: event.target.value, group: event.target.value }))}>
                      <option value="owner">Owners</option>
                      <option value="founder">Developers</option>
                      <option value="staff">Staff</option>
                    </select>
                  </label>

                  <label className="creator-field">
                    <span>الحساب أو القناة</span>
                    <input type="text" value={staffForm.account} onChange={(event) => setStaffForm((current) => ({ ...current, account: event.target.value }))} placeholder="مثال: Discord / Steam / Email" />
                  </label>

                  <label className="creator-field">
                    <span>رابط الصورة</span>
                    <input type="url" value={staffForm.image} onChange={(event) => setStaffForm((current) => ({ ...current, image: event.target.value }))} placeholder="https://..." />
                  </label>

                  <label className="creator-field">
                    <span>رابط الملف الشخصي</span>
                    <input type="url" value={staffForm.url} onChange={(event) => setStaffForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://..." />
                  </label>

                  <label className="creator-field creator-field-wide">
                    <span>حسابات السوشال ميديا</span>
                    <textarea value={staffForm.socialLinks} onChange={(event) => setStaffForm((current) => ({ ...current, socialLinks: event.target.value }))} placeholder="ضع رابطًا واحدًا في كل سطر: Discord, Instagram, X..." rows="3" />
                  </label>
                </div>

                <label className="creator-checkbox">
                  <input type="checkbox" checked={staffForm.visible !== false} onChange={(event) => setStaffForm((current) => ({ ...current, visible: event.target.checked }))} />
                  <span>مرئي في الصفحة العامة</span>
                </label>

                <div className="creator-form-actions">
                  <button type="submit" className="mini-btn">{staffForm.id ? 'حفظ التعديل' : 'إضافة الآن'}</button>
                  <button type="button" className="mini-btn danger" onClick={() => { setStaffFormOpen(false); resetStaffForm() }}>إلغاء</button>
                </div>
              </form>
            )}

            <div className="list-table">
              {filteredStaff.length ? filteredStaff.map((member) => (
                <div key={member.id} className="list-row">
                  <div className="creator-item-info">
                    <div className="creator-mini-avatar" style={{ backgroundImage: member.image ? `url(${member.image})` : 'linear-gradient(135deg, #7c3aed, #2a6bff)' }} />
                    <div>
                      <strong>{member.name}</strong>
                      <small>{member.title || member.role || 'Staff'} • {member.account || member.username || '—'}</small>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="mini-btn" onClick={() => moveStaffMember(member.id, 'up')} disabled={staff.findIndex((item) => item.id === member.id) === 0} aria-label={`رفع ${member.name}`}>↑</button>
                    <button type="button" className="mini-btn" onClick={() => moveStaffMember(member.id, 'down')} disabled={staff.findIndex((item) => item.id === member.id) === staff.length - 1} aria-label={`خفض ${member.name}`}>↓</button>
                    <button type="button" className="mini-btn" onClick={() => openEditStaff(member)}>تعديل</button>
                    <button type="button" className="mini-btn" onClick={() => toggleStaffMember(member.id)}>{member.visible === false ? 'إظهار' : 'إخفاء'}</button>
                    <button type="button" className="mini-btn danger" onClick={() => setPendingDelete({ type: 'staff', id: member.id, name: member.name })}>حذف</button>
                  </div>
                </div>
              )) : (
                <div className="empty-state">لا توجد نتائج مطابقة في الطاقم الإداري.</div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'news' && (
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>إدارة الأخبار</h3>
              <button type="button" className="mini-btn" onClick={() => { resetNewsForm(); setNewsFormOpen(true) }}>+ خبر جديد</button>
            </div>

            {newsFormOpen && (
              <form className="creator-editor" onSubmit={saveNews}>
                <div className="creator-editor-header">
                  <h4>{newsForm.id ? 'تعديل الخبر' : 'إضافة خبر جديد'}</h4>
                  <button type="button" className="mini-btn" onClick={() => { setNewsFormOpen(false); resetNewsForm() }}>إغلاق</button>
                </div>

                <div className="creator-form-grid">
                  <label className="creator-field">
                    <span>عنوان الخبر</span>
                    <input
                      type="text"
                      value={newsForm.title}
                      onChange={(event) => setNewsForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="عنوان الخبر"
                    />
                  </label>

                  <label className="creator-field">
                    <span>تاريخ النشر</span>
                    <input
                      type="datetime-local"
                      value={newsForm.date ? new Date(newsForm.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                      onChange={(event) => setNewsForm((current) => ({ ...current, date: new Date(event.target.value).toISOString() }))}
                    />
                  </label>

                  <label className="creator-field">
                    <span>رابط الصورة</span>
                    <input
                      type="url"
                      value={newsForm.image}
                      onChange={(event) => setNewsForm((current) => ({ ...current, image: event.target.value }))}
                      placeholder="https://..."
                    />
                  </label>
                </div>

                <label className="creator-field settings-full-span">
                  <span>ملخص الخبر</span>
                  <textarea
                    rows="3"
                    value={newsForm.summary}
                    onChange={(event) => setNewsForm((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="ملخص مختصر للخبر"
                  />
                </label>

                <label className="creator-field settings-full-span">
                  <span>محتوى الخبر</span>
                  <textarea
                    rows="6"
                    value={newsForm.content}
                    onChange={(event) => setNewsForm((current) => ({ ...current, content: event.target.value }))}
                    placeholder="اكتب تفاصيل الخبر هنا..."
                  />
                </label>

                <label className="creator-checkbox">
                  <input
                    type="checkbox"
                    checked={newsForm.visible !== false}
                    onChange={(event) => setNewsForm((current) => ({ ...current, visible: event.target.checked }))}
                  />
                  <span>مرئي في الصفحة الرئيسية</span>
                </label>

                <div className="creator-form-actions">
                  <button type="submit" className="mini-btn">{newsForm.id ? 'حفظ التعديل' : 'إضافة الخبر'}</button>
                  <button type="button" className="mini-btn danger" onClick={() => { setNewsFormOpen(false); resetNewsForm() }}>إلغاء</button>
                </div>
              </form>
            )}

            <div className="list-table">
              {news.length ? news.map((item) => (
                <div key={item.id} className="list-row">
                  <div className="creator-item-info">
                    <div className="creator-mini-avatar" style={{ backgroundImage: `url(${item.image || '/img/DS.webp'})` }} />
                    <div className="news-admin-meta">
                      <strong>{item.title}</strong>
                      <div className="news-admin-meta-row">
                        <span className="news-admin-user">
                          <img src={item.authorAvatar || '/img/DS.webp'} alt={item.authorName || 'Admin'} className="news-admin-user-avatar" />
                          {item.authorName || 'Admin'}
                        </span>
                        <small>{new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'numeric', year: 'numeric' })}</small>
                      </div>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="mini-btn" onClick={() => { setNewsForm({ ...item, visible: item.visible !== false }); setNewsFormOpen(true) }}>تعديل</button>
                    <button type="button" className="mini-btn" onClick={() => toggleNewsItem(item.id)}>{item.visible === false ? 'إظهار' : 'إخفاء'}</button>
                    {isOwner && (
                      <button type="button" className="mini-btn danger" onClick={() => setPendingDelete({ type: 'news', id: item.id, name: item.title })}>حذف</button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="empty-state">لا توجد أخبار حالياً.</div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'activities' && (
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>كل الأنشطة</h3>
              {isOwner && (
                <button
                  type="button"
                  className="mini-btn danger"
                  onClick={() => setActivityDeleteConfirm({ type: 'all', title: 'هل تريد حذف كل الأنشطة؟', message: 'سيتم حذف جميع السجلات في سجل الأنشطة نهائيًا.' })}
                >
                  حذف الكل
                </button>
              )}
            </div>

            <div className="panel-search">
              <span className="panel-search-icon">⌕</span>
              <input
                type="search"
                value={activitySearch}
                onChange={(event) => setActivitySearch(event.target.value)}
                placeholder="بحث في الأنشطة: المستخدم، الإجراء، التفاصيل..."
                aria-label="بحث في الأنشطة"
              />
            </div>

            <div className="activity-stream-list">
              {filteredActivities.length ? filteredActivities.map((entry) => {
                const entryAvatar = resolveActivityAvatar(entry)
                const entryName = resolveActivityName(entry)
                const entryTimeText = formatRelativeActivityTime(entry.time || Date.now())

                const actionType = String(entry.action || '').trim()
                const actionClass = actionType.includes('حذف') ? 'action-delete' : actionType.includes('تعديل') ? 'action-edit' : 'action-add'

                return (
                  <div key={entry.id || `${entryName}-${entry.time}`} className="activity-stream-item">
                    {entryAvatar ? (
                      <img src={entryAvatar} alt={entryName} className="activity-avatar-image" />
                    ) : (
                      <span className={`activity-avatar avatar-${entry.color || 'blue'}`}>{entryName.charAt(0).toUpperCase()}</span>
                    )}
                    <div className="activity-stream-copy">
                      <strong>{entryName}</strong>
                      <span className={`activity-action-badge ${actionClass}`}>{entry.action || 'إجراء جديد'}</span>
                      <small>{entry.detail || 'تمت العملية بنجاح.'}</small>
                    </div>
                    <div className="activity-stream-actions">
                      <time>{entryTimeText}</time>
                      {isOwner && (
                        <button
                          type="button"
                          className="mini-btn danger"
                          onClick={() => setActivityDeleteConfirm({ type: 'single', id: entry.id, title: 'هل تريد حذف هذا النشاط؟', message: 'سيتم حذف هذا السجل من قائمة الأنشطة بشكل دائم.' })}
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                )
              }) : (
                <div className="empty-state">لا توجد أنشطة مطابقة للبحث.</div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'settings' && (
          <div className="panel-card">
            <h3>إعدادات الموقع</h3>
            <form className="settings-grid" onSubmit={saveSettings}>
              <label>
                <span>اسم الموقع</span>
                <input name="siteName" defaultValue={settings.siteName || 'DETROIT STATE'} type="text" />
              </label>
              <label>
                <span>رابط الديسكورد</span>
                <input name="discordLink" defaultValue={settings.discordLink || 'https://discord.gg/DSRP'} type="text" />
              </label>
              <label>
                <span>رابط المتجر</span>
                <input name="storeLink" defaultValue={settings.storeLink || 'https://detroit-state-rp.tebex.io/'} type="text" />
              </label>
              <label>
                <span>عنوان الصفحة</span>
                <input name="title" defaultValue={settings.title || 'Royal Community'} type="text" />
              </label>
              <label>
                <span>مدة الاختبار (دقائق)</span>
                <input name="quizTimeoutMinutes" defaultValue={settings.quizTimeoutMinutes || 5} type="number" min="1" max="60" />
              </label>

              <label>
                <span>شعار الفوتر</span>
                <input name="footerLogo" defaultValue={settings.footerLogo || '/img/DS.webp'} type="text" />
              </label>
              <label>
                <span>عنوان الفوتر</span>
                <input name="footerTitle" defaultValue={settings.footerTitle || settings.siteName || 'DETROIT STATE'} type="text" />
              </label>
              <label className="settings-full-span">
                <span>وصف الفوتر</span>
                <textarea name="footerDescription" defaultValue={settings.footerDescription || 'مجتمعنا هو مكان للعب والمرح والتفاعل مع المجتمع، حيث نلتقي للعب، والتنافس، وتبادل الخبرات داخل بيئة نظيفة واحترافية.'} rows="4" />
              </label>
              <label className="settings-full-span">
                <span>روابط سريعة (كل سطر: العنوان|الرابط)</span>
                <textarea
                  name="footerQuickLinks"
                  defaultValue={Array.isArray(settings.footerQuickLinks)
                    ? settings.footerQuickLinks.map((item) => `${item.label}|${item.href}`).join('\n')
                    : 'القوانين العامة|#/rules\nالوظائف|#/jobs\nالأخبار|#/news\nالمتجر|https://detroit-state-rp.tebex.io/'}
                  rows="6"
                />
              </label>
              <label className="settings-full-span">
                <span>تواصل معنا (كل سطر: رابط فقط)</span>
                <textarea
                  name="footerSocials"
                  defaultValue={Array.isArray(settings.footerSocials)
                    ? settings.footerSocials.map((item) => typeof item === 'string' ? item : item.href).join('\n')
                    : 'https://facebook.com\nhttps://www.tiktok.com/@detroitstate?is_from_webapp=1&sender_device=pc\nhttps://discord.gg/DSRP\nhttps://youtube.com'}
                  rows="6"
                />
              </label>
              <label className="settings-full-span">
                <span>نص الحقوق</span>
                <textarea name="footerCopyright" defaultValue={settings.footerCopyright || `${settings.siteName || 'Detroit State'} Community. All rights reserved 2026`} rows="3" />
              </label>

              <div className="settings-actions">
                <button type="submit" className="mini-btn">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
