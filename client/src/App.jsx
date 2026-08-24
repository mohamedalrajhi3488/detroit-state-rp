import React, { useEffect, useRef, useState } from 'react'
import { defaultPages as DEFAULT_PAGES, normalizePages as normalizeSitePages, isPageAccessible } from './siteDataUtils.mjs'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Shop from './components/Shop'
import Streamers from './components/Streamers'
import Jobs from './components/Jobs'
import Rules from './components/Rules'
import Faq from './components/Faq'
import Footer from './components/Footer'
import LoginPage from './components/LoginPage'
import AdminPanel from './components/AdminPanel'
import {
  deleteActivityFromFirestore,
  deleteAllActivitiesFromFirestore,
  getActivityFromFirestore,
  getPagesFromFirestore,
  getSettingsFromFirestore,
  getCreatorsFromFirestore,
  getUsersFromFirestore,
  saveActivityToFirestore,
  saveCreatorsToFirestore,
  saveNewsToFirestore,
  savePagesToFirestore,
  saveSettingsToFirestore,
  saveShopProductsToFirestore,
  saveUserToFirestore,
  saveUsersToFirestore,
  getNewsFromFirestore,
  getShopProductsFromFirestore
} from './firebase'
import './style.css'
import './admin.css'

const STORAGE_KEY = 'detroitstate_site_data_v1'
const LOGGED_USER_KEY = 'detroitstate_logged_user_v1'
const ACTIVITY_STORAGE_KEY = 'detroitstate_activity_log_v1'
const LOGIN_RECORD_KEY_PREFIX = 'detroitstate_login_logged_'
const TEMP_ADMIN_USERNAME = 'admin'
const TEMP_ADMIN_PASSWORD = 'admin123'

const getLoginRecordKey = (userId) => `${LOGIN_RECORD_KEY_PREFIX}${userId}`

const hasRecordedLogin = (userId) => {
  if (!userId || typeof window === 'undefined') return false
  return localStorage.getItem(getLoginRecordKey(userId)) === '1'
}

const markLoginRecorded = (userId) => {
  if (!userId || typeof window === 'undefined') return
  localStorage.setItem(getLoginRecordKey(userId), '1')
}

const clearLoginRecord = (userId) => {
  if (!userId || typeof window === 'undefined') return
  localStorage.removeItem(getLoginRecordKey(userId))
}

const defaultPages = DEFAULT_PAGES

const DEMO_USER_EMAILS = new Set(['admin@detroitstate.gg', 'mod@detroitstate.gg', 'support@detroitstate.gg'])

const defaultUsers = []

const sanitizeUsers = (users = []) => {
  if (!Array.isArray(users)) return []

  return users.filter((user) => {
    const email = String(user?.email || '').trim().toLowerCase()
    const name = String(user?.name || user?.username || '').trim().toLowerCase()
    const isDemo = DEMO_USER_EMAILS.has(email) || ['admin', 'mod', 'support'].includes(name)
    return !isDemo
  })
}

const defaultSettings = {
  siteName: 'DETROIT STATE',
  discordLink: 'https://discord.gg/DSRP',
  storeLink: 'https://detroit-state-rp.tebex.io/',
  title: 'Royal Community',
  footerLogo: '/img/DS.webp',
  footerTitle: 'DETROIT STATE',
  footerDescription: 'مجتمعنا هو مكان للعب والمرح والتفاعل مع المجتمع، حيث نلتقي للعب، والتنافس، وتبادل الخبرات داخل بيئة نظيفة واحترافية.',
  footerCopyright: '© 2026 Detroit State. جميع الحقوق محفوظة. صنع بواسطة Dreko8u',

  footerQuickLinks: [
    { label: 'القوانين العامة', href: '#/rules' },
    { label: 'الوظائف', href: '#/jobs' },
    { label: 'الدعم الفني', href: '#/support' },
    { label: 'المتجر', href: 'https://detroit-state-rp.tebex.io/', external: true }
  ],
  footerSocials: [
    { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@detroitstate?is_from_webapp=1&sender_device=pc', icon: 'tiktok' },
    { label: 'Discord', href: 'https://discord.gg/DSRP', icon: 'discord' },
    { label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' }
  ]
}

const defaultCreators = []

const defaultShopProducts = []

const arabicDateDigits = (value) => toLatinDigits(String(value ?? ''))

const formatNewsDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const year = arabicDateDigits(date.getFullYear())
  const month = arabicDateDigits(String(date.getMonth() + 1).padStart(2, '0'))
  const day = arabicDateDigits(String(date.getDate()).padStart(2, '0'))

  return `${year}-${month}-${day}`
}

const normalizeNews = (news = []) => {
  if (!Array.isArray(news)) return []

  return news
    .filter((item) => item && (item.visible !== false))
    .map((item, index) => ({
      id: item.id || `news-${Date.now()}-${index}`,
      title: item.title || `خبر ${index + 1}`,
      summary: item.summary || item.content || 'إعلان جديد من إدارة المجتمع.',
      content: item.content || item.summary || 'إعلان جديد من إدارة المجتمع.',
      image: item.image || '/img/DS.webp',
      date: item.date || new Date().toISOString(),
      visible: item.visible !== false,
      authorName: item.authorName || item.editor || item.author || 'Admin',
      authorAvatar: item.authorAvatar || item.avatar || '/img/DS.webp',
      authorRole: item.authorRole || 'تمت إضافة بواسطة'
    }))
}

const buildDiscordAvatar = (user) => {
  if (!user) return '/img/DS.webp'
  if (user.avatar && user.avatar.startsWith('http')) return user.avatar
  if (user.avatar && user.id) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
  const seed = encodeURIComponent((user.name || user.username || user.email || 'user').trim() || 'user')
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`
}

const toLatinDigits = (value) => String(value).replace(/[٠-٩]/g, (char) => '٠١٢٣٤٥٦٧٨٩'.indexOf(char)).replace(/[۰-۹]/g, (char) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(char))

const getDiscordJoinDate = (user) => {
  if (!user?.id) {
    const now = new Date()
    return `${toLatinDigits(String(now.getDate()).padStart(2, '0'))}/${toLatinDigits(String(now.getMonth() + 1).padStart(2, '0'))}/${toLatinDigits(String(now.getFullYear()))}`
  }

  try {
    const snowflake = BigInt(user.id)
    const timestamp = Number((snowflake >> 22n) + 1420070400000n)
    const date = new Date(timestamp)
    return `${toLatinDigits(String(date.getDate()).padStart(2, '0'))}/${toLatinDigits(String(date.getMonth() + 1).padStart(2, '0'))}/${toLatinDigits(String(date.getFullYear()))}`
  } catch {
    const now = new Date()
    return `${toLatinDigits(String(now.getDate()).padStart(2, '0'))}/${toLatinDigits(String(now.getMonth() + 1).padStart(2, '0'))}/${toLatinDigits(String(now.getFullYear()))}`
  }
}

const getDiscordPresenceText = (status) => {
  if (status === 'not_in_guild') return 'غير موجود في السيرفر'
  if (!status || status === 'offline') return 'غير متصل'
  if (status === 'online') return 'متصل'
  if (status === 'idle') return 'غير متاح'
  if (status === 'dnd') return 'لا يزعج'
  return 'غير متصل'
}

const getDiscordPresenceColor = (status) => {
  if (status === 'not_in_guild') return '#111827'
  if (!status || status === 'offline') return '#8b93a8'
  if (status === 'online') return '#40f0a3'
  if (status === 'idle') return '#f7c948'
  if (status === 'dnd') return '#ff5d5d'
  return '#8b93a8'
}

const resolvePageType = (page, index) => {
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

const normalizePages = (pages) => normalizeSitePages(pages || defaultPages)

const buildSeedActivityLog = (users = []) => {
  const baseUsers = users.length ? users : defaultUsers
  const now = Date.now()

  return baseUsers.slice(0, 10).map((user, index) => {
    const offsetHours = (index + 1) * 8
    const time = new Date(now - offsetHours * 60 * 60 * 1000).toISOString()
    return {
      id: `seed-${user.id || index}-${index}`,
      user: user.name || `User ${index + 1}`,
      action: index % 2 === 0 ? 'تسجيل دخول' : 'تحديث الملف الشخصي',
      detail: index % 2 === 0 ? 'تم تسجيل الدخول إلى الموقع بنجاح.' : 'تم تحديث تفاصيل الحساب.',
      color: ['gold', 'blue', 'pink', 'green'][index % 4],
      time
    }
  })
}

const getSavedActivityLog = () => {
  if (typeof window === 'undefined') return []

  try {
    const saved = localStorage.getItem(ACTIVITY_STORAGE_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.length) return []
    return parsed
  } catch {
    return []
  }
}

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

const getSavedData = () => {
  if (typeof window === 'undefined') return { pages: defaultPages, users: [], settings: defaultSettings }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { pages: defaultPages, users: [], settings: defaultSettings, creators: defaultCreators, news: [] }

    const parsed = JSON.parse(saved)
    return {
      pages: normalizePages(parsed.pages),
      users: sanitizeUsers(parsed.users),
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
      creators: (parsed.creators || defaultCreators).map((creator, index) => ({
        id: creator.id || Date.now() + index,
        name: creator.name || `Creator ${index + 1}`,
        platform: creator.platform || 'TikTok',
        followers: creator.followers || '0 Followers',
        image: creator.image || '',
        url: creator.url || '',
        visible: creator.visible !== false,
        order: creator.order || index + 1
      })),
      news: normalizeNews(parsed.news || []),
      products: Array.isArray(parsed.products) && parsed.products.length ? parsed.products : defaultShopProducts
    }
  } catch {
    return { pages: defaultPages, users: [], settings: defaultSettings, creators: defaultCreators, news: [], products: defaultShopProducts }
  }
}

export default function App() {
  const handledLoginIdsRef = useRef(new Set())
  const processingLoginIdsRef = useRef(new Set())
  const lastSeenUpdateRef = useRef(new Map())
  const siteDataHydratedRef = useRef(false)
  const pageTransitionTimerRef = useRef(null)
  const [appLoading, setAppLoading] = useState(true)
  const [screen, setScreen] = useState('home')
  const [siteData, setSiteData] = useState(getSavedData)
  const [activityLog, setActivityLog] = useState(getSavedActivityLog)
  const [currentPage, setCurrentPage] = useState('home')
  const [pageTransitionKey, setPageTransitionKey] = useState(0)
  const [isPageChanging, setIsPageChanging] = useState(false)
  const [loggedUser, setLoggedUser] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      return JSON.parse(localStorage.getItem(LOGGED_USER_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [selectedNewsItem, setSelectedNewsItem] = useState(null)

  const handleDeleteActivity = async (activityId) => {
    if (!activityId) return

    const isDeleted = await deleteActivityFromFirestore(activityId)

    try {
      await fetch(`/api/activity-log/${encodeURIComponent(String(activityId))}`, { method: 'DELETE' })
    } catch {
      // ignore server deletion issues; local state is updated below
    }

    setActivityLog((current) => {
      const next = current.filter((item) => String(item.id) !== String(activityId))
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next))
      return next
    })

    if (!isDeleted) {
      const localEntry = activityLog.find((item) => String(item.id) === String(activityId))
      if (localEntry) {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activityLog.filter((item) => String(item.id) !== String(activityId))))
      }
    }
  }

  const handleDeleteAllActivities = async () => {
    const deletedFromFirestore = await deleteAllActivitiesFromFirestore()

    try {
      await fetch('/api/activity-log', { method: 'DELETE' })
    } catch {
      // ignore server deletion issues; local state is updated below
    }

    setActivityLog(() => {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify([]))
      return []
    })

    if (!deletedFromFirestore) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify([]))
    }
  }

  const handleAddActivity = async (entry) => {
    if (!entry || !entry.user) return

    const finalEntry = {
      id: entry.id || `activity-${Date.now()}`,
      user: entry.user,
      avatar: entry.avatar || null,
      action: entry.action || 'إجراء جديد',
      detail: entry.detail || 'تمت العملية بنجاح.',
      color: entry.color || 'purple',
      time: entry.time || new Date().toISOString()
    }

    try {
      const savedEntry = await saveActivityToFirestore(finalEntry)
      const nextEntry = savedEntry || finalEntry
      setActivityLog((current) => {
        const filtered = current.filter((item) => String(item.id) !== String(nextEntry.id))
        const next = [nextEntry, ...filtered].slice(0, 50)
        localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next))
        return next
      })
    } catch {
      setActivityLog((current) => {
        const filtered = current.filter((item) => String(item.id) !== String(finalEntry.id))
        const next = [finalEntry, ...filtered].slice(0, 50)
        localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next))
        return next
      })
    }
  }

  useEffect(() => {
    const preventSelection = (event) => {
      const target = event.target
      if (!target || typeof target.closest !== 'function') return

      if (target.closest('input, textarea, select, [contenteditable="true"]')) {
        return
      }

      event.preventDefault()
    }

    const preventShortcut = (event) => {
      const key = event.key
      const isDevToolsShortcut =
        key === 'F12' ||
        (event.ctrlKey && event.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(key)) ||
        (event.ctrlKey && ['u', 'U', 's', 'S', 'p', 'P'].includes(key)) ||
        (event.metaKey && event.altKey && ['i', 'I'].includes(key))

      if (isDevToolsShortcut) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    document.addEventListener('contextmenu', preventSelection)
    document.addEventListener('copy', preventSelection)
    document.addEventListener('cut', preventSelection)
    document.addEventListener('selectstart', preventSelection)
    document.addEventListener('keydown', preventShortcut)

    return () => {
      document.removeEventListener('contextmenu', preventSelection)
      document.removeEventListener('copy', preventSelection)
      document.removeEventListener('cut', preventSelection)
      document.removeEventListener('selectstart', preventSelection)
      document.removeEventListener('keydown', preventShortcut)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(siteData))
  }, [siteData])

  useEffect(() => {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activityLog))
  }, [activityLog])

  useEffect(() => {
    const syncFirestoreSiteData = async () => {
      try {
        const firestoreData = await Promise.all([
          getSettingsFromFirestore(),
          getPagesFromFirestore(),
          getCreatorsFromFirestore(),
          getNewsFromFirestore(),
          getShopProductsFromFirestore()
        ])

        const [settings, pages, creators, news, products] = firestoreData
        const hasRemoteData = Boolean(settings) || pages.length > 0 || creators.length > 0 || news.length > 0 || products.length > 0

        if (hasRemoteData) {
          siteDataHydratedRef.current = true
          setSiteData((current) => ({
            ...current,
            settings: settings || current.settings || defaultSettings,
            pages: normalizePages(pages.length ? pages : current.pages || defaultPages),
            creators: creators.length ? creators : current.creators || defaultCreators,
            news: normalizeNews(news.length ? news : current.news || []),
            products: products.length ? products : current.products || defaultShopProducts
          }))
          return
        }
      } catch {
        // ignore sync issues and fall back to the browser cache below
      }

      const savedLocal = getSavedData()
      if (savedLocal && (
        Array.isArray(savedLocal.pages) && savedLocal.pages.length > 0 ||
        Array.isArray(savedLocal.creators) && savedLocal.creators.length > 0 ||
        Array.isArray(savedLocal.news) && savedLocal.news.length > 0 ||
        savedLocal.settings
      )) {
        siteDataHydratedRef.current = true
        setSiteData(savedLocal)
      }
    }

    syncFirestoreSiteData()
  }, [])

  useEffect(() => {
    const syncActivityLog = async () => {
      try {
        const firestoreData = await getActivityFromFirestore(20)
        if (Array.isArray(firestoreData) && firestoreData.length) {
          setActivityLog(firestoreData)
          return
        }

        const res = await fetch('/api/activity-log?limit=20', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data) && data.length) {
          setActivityLog(data)
        }
      } catch {
        // fallback to browser storage when the server is unavailable
      }
    }

    const syncRegisteredUsers = async () => {
      try {
        const firestoreUsers = await getUsersFromFirestore()
        if (Array.isArray(firestoreUsers) && firestoreUsers.length) {
          setSiteData((current) => ({
            ...current,
            users: firestoreUsers
          }))
          return
        }

        const res = await fetch('/api/registered-users', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data) && data.length) {
          setSiteData((current) => ({
            ...current,
            users: [...data, ...((current.users || []).filter((user) => !data.some((registered) => String(registered.id) === String(user.id))))]
          }))
        }
      } catch {
        // ignore background sync failures
      }
    }

    syncActivityLog()
    syncRegisteredUsers()

    const id = window.setInterval(() => {
      syncActivityLog()
      syncRegisteredUsers()
    }, 15000)

    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (loggedUser) {
      localStorage.setItem(LOGGED_USER_KEY, JSON.stringify(loggedUser))
    } else {
      localStorage.removeItem(LOGGED_USER_KEY)
    }
  }, [loggedUser])

  const isAdminLevelUser = (user) => {
    const role = String(getEffectiveUserRole(user || loggedUser)).trim().toLowerCase()
    return ['owner', 'admin', 'mod'].includes(role)
  }

  useEffect(() => {
    if (!siteData || !siteData.settings) return
    if (!siteDataHydratedRef.current) return
    if (!isAdminLevelUser(loggedUser)) return
    saveSettingsToFirestore(siteData.settings).catch(() => {})
  }, [siteData.settings, loggedUser?.id, siteDataHydratedRef.current])

  useEffect(() => {
    if (!siteData || !Array.isArray(siteData.users)) return
    if (!siteDataHydratedRef.current) return
    if (!isAdminLevelUser(loggedUser)) return
    saveUsersToFirestore(siteData.users).catch(() => {})
  }, [siteData.users, loggedUser?.id, siteDataHydratedRef.current])

  useEffect(() => {
    if (!siteData || !Array.isArray(siteData.pages)) return
    if (!siteDataHydratedRef.current) return
    if (!isAdminLevelUser(loggedUser)) return
    savePagesToFirestore(siteData.pages).catch(() => {})
  }, [siteData.pages, loggedUser?.id, siteDataHydratedRef.current])

  useEffect(() => {
    if (!siteData || !Array.isArray(siteData.creators)) return
    if (!siteDataHydratedRef.current) return
    if (!isAdminLevelUser(loggedUser)) return
    saveCreatorsToFirestore(siteData.creators).catch(() => {})
  }, [siteData.creators, loggedUser?.id, siteDataHydratedRef.current])

  useEffect(() => {
    if (!siteData || !Array.isArray(siteData.news)) return
    if (!siteDataHydratedRef.current) return
    if (!isAdminLevelUser(loggedUser)) return
    saveNewsToFirestore(siteData.news).catch(() => {})
  }, [siteData.news, loggedUser?.id, siteDataHydratedRef.current])

  useEffect(() => {
    if (!siteData || !Array.isArray(siteData.products)) return
    if (!siteDataHydratedRef.current) return
    if (!isAdminLevelUser(loggedUser)) return
    saveShopProductsToFirestore(siteData.products).catch(() => {})
  }, [siteData.products, loggedUser?.id, siteDataHydratedRef.current])

  useEffect(() => {
    if (!loggedUser || !loggedUser.id || !Array.isArray(siteData.users)) return

    const matchedUser = siteData.users.find((userItem) => String(userItem.id) === String(loggedUser.id))
    if (matchedUser && matchedUser.role && matchedUser.role !== loggedUser.role) {
      setLoggedUser((current) => current ? { ...current, role: matchedUser.role } : current)
    }
  }, [loggedUser?.id, siteData.users])

  useEffect(() => {
    if (!loggedUser || !loggedUser.id) return

    const userId = String(loggedUser.id)
    if (handledLoginIdsRef.current.has(userId) || processingLoginIdsRef.current.has(userId)) {
      return
    }

    processingLoginIdsRef.current.add(userId)

    const matchedStoredUser = Array.isArray(siteData.users)
      ? siteData.users.find((userItem) => String(userItem.id) === userId)
      : null
    const isAlreadyKnownUser = Boolean(matchedStoredUser || hasRecordedLogin(userId))
    const effectiveRole = matchedStoredUser?.role || loggedUser.role || 'Discord User'

    const userPayload = {
      id: userId,
      name: loggedUser.name || loggedUser.username || 'مستخدم',
      email: loggedUser.email || `${(loggedUser.username || loggedUser.name || 'user').toLowerCase()}@discord`,
      role: effectiveRole,
      avatar: loggedUser.avatar || null,
      firstLoginAt: matchedStoredUser?.firstLoginAt || loggedUser.firstLoginAt || new Date().toISOString()
    }

    const syncUserState = async () => {
      try {
        const savedUser = await saveUserToFirestore(userPayload)

        if (savedUser) {
          setSiteData((current) => ({
            ...current,
            users: Array.isArray(current.users)
              ? [savedUser, ...current.users.filter((u) => String(u.id) !== String(savedUser.id))]
              : [savedUser]
          }))

          setLoggedUser((current) => (current ? { ...current, role: savedUser.role || current.role || 'Discord User' } : current))
        }

        if (!isAlreadyKnownUser && !hasRecordedLogin(userId)) {
          const savedActivity = await saveActivityToFirestore({
            id: `login-${userId}-${Date.now()}`,
            user: userPayload.name,
            avatar: userPayload.avatar,
            action: 'تسجيل دخول',
            detail: 'تم تسجيل الدخول إلى حساب المستخدم بنجاح.',
            color: 'blue',
            time: new Date().toISOString()
          })

          if (savedActivity) {
            setActivityLog((current) => {
              const exists = current.some((item) => item.id === savedActivity.id)
              return exists ? current : [savedActivity, ...current].slice(0, 50)
            })
          }

          markLoginRecorded(userId)
        }

        if (!isAlreadyKnownUser) {
          const response = await fetch('/api/register-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userPayload)
          })

          if (response.ok) {
            const payload = await response.json()
            if (Array.isArray(payload.users)) {
              setSiteData((current) => ({
                ...current,
                users: payload.users
              }))
            }

            if (payload.activity) {
              setActivityLog((current) => {
                const exists = current.some((item) => item.id === payload.activity.id)
                return exists ? current : [payload.activity, ...current].slice(0, 50)
              })
            }
          }
        }

        handledLoginIdsRef.current.add(userId)
      } catch {
        // no-op: local fallback remains in browser storage for offline scenarios
      } finally {
        processingLoginIdsRef.current.delete(userId)
      }
    }

    syncUserState()
  }, [loggedUser?.id])

  useEffect(() => {
    let active = true
    const loadDiscordUser = async () => {
      try {
        const res = await fetch('/me', { credentials: 'same-origin' })
        if (!res.ok) {
          if (active) {
            const storedUser = (() => {
              try {
                return JSON.parse(localStorage.getItem(LOGGED_USER_KEY) || 'null')
              } catch {
                return null
              }
            })()
            if (storedUser) {
              setLoggedUser(storedUser)
            } else {
              setLoggedUser(null)
            }
          }
          return
        }
        const data = await res.json()
        if (!active) return

        const matchedStoredUser = Array.isArray(siteData.users)
          ? siteData.users.find((userItem) => String(userItem.id) === String(data.id))
          : null

        const storedUser = (() => {
          try {
            return JSON.parse(localStorage.getItem(LOGGED_USER_KEY) || 'null')
          } catch {
            return null
          }
        })()

        const resolvedRole = matchedStoredUser?.role || storedUser?.role || 'Discord User'

        const resolvedUser = {
          id: data.id,
          name: data.username || data.name || 'User',
          email: data.email || `${(data.username || 'user').toLowerCase()}@discord`,
          avatar: buildDiscordAvatar(data),
          role: resolvedRole,
          status: data.status || 'offline'
        }

        setLoggedUser(resolvedUser)
        syncLoggedUserToFirestore(resolvedUser)
      } catch {
        if (active) {
          const storedUser = (() => {
            try {
              return JSON.parse(localStorage.getItem(LOGGED_USER_KEY) || 'null')
            } catch {
              return null
            }
          })()
          if (storedUser) {
            setLoggedUser(storedUser)
          } else {
            setLoggedUser(null)
          }
        }
      }
    }

    loadDiscordUser()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace('#/', '').trim()
      const path = window.location.pathname.replace(/\/+$/, '')

      if (path === '/admin') {
        setScreen('admin')
        setCurrentPage('home')
        return
      }

      if (screen === 'admin' && path !== '/admin') {
        setScreen('home')
      }

      setCurrentPage(hash || 'home')
    }

    syncHash()
    window.addEventListener('hashchange', syncHash)
    window.addEventListener('popstate', syncHash)
    return () => {
      window.removeEventListener('hashchange', syncHash)
      window.removeEventListener('popstate', syncHash)
    }
  }, [screen])

  useEffect(() => {
    return () => {
      if (pageTransitionTimerRef.current) {
        window.clearTimeout(pageTransitionTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hideLoader = () => setAppLoading(false)
    const showLoader = () => setAppLoading(true)

    window.addEventListener('beforeunload', showLoader)

    const timer = window.setTimeout(hideLoader, 3000)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('beforeunload', showLoader)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    const resetScroll = () => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      })
    }

    resetScroll()
    const timeoutId = window.setTimeout(resetScroll, 60)
    return () => window.clearTimeout(timeoutId)
  }, [screen, currentPage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    document.body.style.overflow = appLoading ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [appLoading])

  function getEffectiveUserRole(user) {
    if (!user) return 'member'

    const directRole = (user.role || '').toString().trim()
    if (directRole && directRole.toLowerCase() !== 'discord user') {
      return directRole
    }

    const matchedUser = Array.isArray(siteData.users)
      ? siteData.users.find((entry) => String(entry.id) === String(user.id) || String(entry.email || '').toLowerCase() === String(user.email || '').toLowerCase())
      : null

    return matchedUser?.role || directRole || 'member'
  }

  const visiblePages = (siteData.pages || defaultPages)
    .filter((page) => page.status === 'visible')
    .filter((page) => isPageAccessible(page, getEffectiveUserRole(loggedUser)))

  const handlePageSelect = (pageId) => {
    if (pageTransitionTimerRef.current) {
      window.clearTimeout(pageTransitionTimerRef.current)
    }

    setIsPageChanging(true)
    setAccountMenuOpen(false)

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      window.location.hash = pageId === 'home' ? '/' : `/${pageId}`
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/')
      }
    }

    pageTransitionTimerRef.current = window.setTimeout(() => {
      setCurrentPage(pageId)
      setScreen('home')
      setPageTransitionKey((value) => value + 1)
      setIsPageChanging(false)
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      })
    }, 180)
  }

  const handleLogin = () => {
    setAccountMenuOpen(false)
    window.location.href = '/auth/discord'
  }

  const handleLogout = async () => {
    const currentUserId = loggedUser?.id
    setLoggedUser(null)
    setAccountMenuOpen(false)
    setScreen('home')

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LOGGED_USER_KEY)
      if (currentUserId) {
        clearLoginRecord(currentUserId)
        handledLoginIdsRef.current.delete(String(currentUserId))
        processingLoginIdsRef.current.delete(String(currentUserId))
      }
      document.cookie = 'sid=; Max-Age=0; path=/; SameSite=Lax'
      if (window.location.pathname === '/admin') {
        window.history.pushState({}, '', '/')
      }
    }

    try {
      await fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin'
      })
    } catch {
      // no-op: local logout is still applied even if the server request fails
    }
  }

  const syncLoggedUserToFirestore = async (userData) => {
    if (!userData || !userData.id) return null

    const userId = String(userData.id)
    const now = Date.now()
    const lastSeenUpdateAt = lastSeenUpdateRef.current.get(userId) || 0
    if (now - lastSeenUpdateAt < 30000) {
      return null
    }
    lastSeenUpdateRef.current.set(userId, now)

    const matchingUser = Array.isArray(siteData.users)
      ? siteData.users.find((item) => String(item.id) === userId)
      : null

    const userPayload = {
      id: userId,
      name: userData.name || userData.username || 'مستخدم',
      email: userData.email || `${(userData.username || userData.name || 'user').toLowerCase()}@discord`,
      role: matchingUser?.role || userData.role || 'Member',
      avatar: userData.avatar || null,
      firstLoginAt: matchingUser?.firstLoginAt || userData.firstLoginAt || new Date().toISOString(),
      lastSeen: new Date().toISOString()
    }

    try {
      const savedUser = await saveUserToFirestore(userPayload)
      const nextUsers = Array.isArray(siteData.users)
        ? [savedUser || userPayload, ...siteData.users.filter((item) => String(item.id) !== userId)]
        : [savedUser || userPayload]

      setSiteData((current) => ({
        ...current,
        users: nextUsers
      }))

      const response = await fetch('/api/register-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload)
      })

      if (!response.ok) {
        return savedUser || userPayload
      }

      const payload = await response.json()
      if (Array.isArray(payload.users)) {
        setSiteData((current) => ({
          ...current,
          users: payload.users
        }))
      }

      return payload.user || savedUser || userPayload
    } catch {
      const fallbackUser = userPayload
      setSiteData((current) => ({
        ...current,
        users: Array.isArray(current.users)
          ? [fallbackUser, ...current.users.filter((item) => String(item.id) !== userId)]
          : [fallbackUser]
      }))
      return fallbackUser
    }
  }

  const renderCustomPage = (page) => (
    <section className="dynamic-page-shell">
      <div className="dynamic-page-card">
        <span className="dynamic-page-badge">{page.name}</span>
        <h2>{page.name}</h2>
        <p>{page.description || 'محتوى هذه الصفحة يتم التحكم به من لوحة الإدارة.'}</p>
        <div className="dynamic-page-grid">
          <article>
            <strong>محتوى الصفحة</strong>
            <p>تم ربط هذه الصفحة بالنظام الديناميكي داخل لوحة الإدارة، ويمكن إخفاؤها أو إظهارها أو حذفها في أي وقت.</p>
          </article>
          <article>
            <strong>التحكم</strong>
            <p>كل تعديلات الصفحة تُحفظ مباشرة داخل الموقع وتنعكس في القائمة الرئيسية فوراً.</p>
          </article>
        </div>
      </div>
    </section>
  )

  const renderNewsPage = () => {
    const newsItems = normalizeNews(siteData.news || [])
    const permanentHeroImage = '/img/banner.png'
    const secondary = newsItems.slice(0, 4)

    return (
      <section className="news-page-shell">
        <div className="news-hero-shell">
          <div
            className="news-hero-background"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(10, 6, 18, 0.8), rgba(10, 6, 18, 0.36)), url(${permanentHeroImage})`
            }}
          />

          <div className="news-hero-content">
            <h1 className="hero-title news-title">
              <span className="hero-word">DS NEWS</span>
              <span className="hero-word ghost">DS NEWS</span>
            </h1>

            <p className="hero-subtitle news-subtitle">
             تغطية حصرية لكل ما يحدث في مجتمع ديترويت. كن أول من يعرف التحديثات والفعاليات.
            </p>
          </div>

        </div>

        {secondary.length > 0 ? (
          <div id="news-latest-grid" className="news-latest-grid">
            {secondary.map((item) => (
              <article key={item.id} className="news-compact-card">
                <div className="news-compact-image" style={{ backgroundImage: `url(${item.image || '/img/DS.webp'})` }} />
                <div className="news-compact-body">
                  <div className="news-meta-row">
                    <span className="news-date">{formatNewsDate(item.date)}</span>
                    <div className="news-author-row">
                      <span className="news-author-role">تمت إضافة بواسطة</span>
                      <img src={item.authorAvatar || '/img/DS.webp'} alt={item.authorName || 'Admin'} className="news-author-avatar" />
                      <span className="news-author-name">{item.authorName || 'Admin'}</span>
                    </div>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <button type="button" className="news-card-action" onClick={() => setSelectedNewsItem(item)}>
                    تفاصيل الخبر
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="news-empty-state">
            <h3>لا توجد أخبار حتى الآن</h3>
          </div>
        )}

        {selectedNewsItem && (
          <div
            className="news-modal-overlay"
            onClick={() => setSelectedNewsItem(null)}
            role="dialog"
            aria-modal="true"
          >
            <div className="news-modal-card" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="news-modal-close" onClick={() => setSelectedNewsItem(null)} aria-label="إغلاق الخبر">
                ×
              </button>

              <div
                className="news-modal-image"
                style={{ backgroundImage: `url(${selectedNewsItem.image || '/img/DS.webp'})` }}
              />

              <div className="news-modal-content">
                <div className="news-meta-row news-meta-row-modal">
                  <span className="news-date">{formatNewsDate(selectedNewsItem.date)}</span>
                  <div className="news-author-row news-author-row-modal">
                    <span className="news-author-role">تمت إضافة بواسطة</span>
                    <img src={selectedNewsItem.authorAvatar || '/img/DS.webp'} alt={selectedNewsItem.authorName || 'Admin'} className="news-author-avatar" />
                    <span className="news-author-name">{selectedNewsItem.authorName || 'Admin'}</span>
                  </div>
                </div>
                <h2>{selectedNewsItem.title}</h2>
                <div className="news-modal-body">
                  {(selectedNewsItem.content || selectedNewsItem.summary || '').split(/\n+/).map((paragraph, index) => (
                    <p key={`${selectedNewsItem.id}-p-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    )
  }

  const renderDynamicPage = () => {
    const normalizedPageKey = String(currentPage || '').trim().toLowerCase()
    if (['store', 'shop', 'srote', 'strore'].includes(normalizedPageKey)) {
      return <Shop products={siteData.products || defaultShopProducts} />
    }

    if (currentPage === 'home' || !currentPage) {
      return (
        <>
          <Hero />
          <Features />
          <Streamers creators={siteData.creators || defaultCreators} />
          <Rules />
          <Jobs />
        </>
      )
    }

    const page = (siteData.pages || defaultPages).find((item) => item.id === currentPage)
    const effectiveRole = getEffectiveUserRole(loggedUser)
    const pageAllowed = page ? isPageAccessible(page, effectiveRole) : false

    if (!page || page.status !== 'visible' || !pageAllowed) {
      return (
        <section className="page-placeholder">
          <div className="page-placeholder-card">
            <span>404</span>
            <h2>هذه الصفحة غير متاحة حالياً</h2>
            <p>قد تكون الصفحة مخفية أو تم حذفها من الأدمن، أو تتطلب صلاحية الإدارة.</p>
          </div>
        </section>
      )
    }

    if (page.type === 'shop') return <Shop products={siteData.products || defaultShopProducts} />
    if (page.type === 'jobs') return <Jobs />
    if (page.type === 'rules') return <Rules />
    if (page.type === 'activities') {
      return (
        <section className="dynamic-page-shell">
          <div className="dynamic-page-card activity-stream-page">
            <span className="dynamic-page-badge">{page.name}</span>
            <h2>{page.name}</h2>
            <p>{page.description}</p>
            <div className="activity-stream-list">
              {activityLog.map((entry) => {
                const actionType = String(entry.action || '').trim()
                const actionClass = actionType.includes('حذف') ? 'action-delete' : actionType.includes('تعديل') ? 'action-edit' : 'action-add'

                return (
                  <div key={entry.id} className="activity-stream-item">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt={entry.user || 'user'} className="activity-avatar-image" />
                    ) : (
                      <span className={`activity-avatar avatar-${entry.color || 'blue'}`}>{(entry.user || 'U').charAt(0).toUpperCase()}</span>
                    )}
                    <div className="activity-stream-copy">
                      <strong>{entry.user || 'مستخدم'}</strong>
                      <span className={`activity-action-badge ${actionClass}`}>{entry.action || 'إجراء جديد'}</span>
                      <small>{entry.detail || 'تمت العملية بنجاح.'}</small>
                    </div>
                    <time>{formatNumericActivityTime(entry.time)}</time>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )
    }
    if (page.type === 'news') return renderNewsPage()
    if (page.type === 'tutorials') return (
      <>
        <section className="dynamic-page-shell">
          <div className="dynamic-page-card">
            <span className="dynamic-page-badge">{page.name}</span>
            <h2>{page.name}</h2>
            <p>{page.description}</p>
            <div className="dynamic-page-grid">
              <article><strong>اختيار الهوية</strong><p>ابدأ بطريقة صحيحة من خلال القراءة والفهم قبل دخول المدينة.</p></article>
              <article><strong>استراتيجية السوفت</strong><p>تعرف على أفضل الممارسات والأنظمة داخل المجتمع.</p></article>
            </div>
          </div>
        </section>
        <Faq />
      </>
    )
    if (page.type === 'quiz') return <section className="dynamic-page-shell"><div className="dynamic-page-card"><span className="dynamic-page-badge">{page.name}</span><h2>{page.name}</h2><p>{page.description}</p><div className="dynamic-page-grid"><article><strong>الاختبارات الحالية</strong><p>اختبارات خاصة بالمواصفات والمهارات داخل المجتمع.</p></article><article><strong>التقييم</strong><p>يتم تصنيف المشاركين بناءً على جودة إجاباتهم ومهاراتهم.</p></article></div></div></section>
    if (page.type === 'tournaments') return <section className="dynamic-page-shell"><div className="dynamic-page-card"><span className="dynamic-page-badge">{page.name}</span><h2>{page.name}</h2><p>{page.description}</p><div className="dynamic-page-grid"><article><strong>فعاليات قادمة</strong><p>بطولات يومية وأسبوعية مع جوائز ومزايا خاصة.</p></article><article><strong>التسجيل</strong><p>يمكن للعضو التقديم عبر الديسكورد أو من الموقع مباشرة.</p></article></div></div></section>

    return renderCustomPage(page)
  }

  if (screen === 'login') {
    return (
      <div className="app-shell">
        <Navbar
          pages={visiblePages}
          settings={siteData.settings}
          onLoginClick={() => setScreen('login')}
          currentPage={currentPage}
          onPageSelect={handlePageSelect}
          loggedUser={loggedUser}
          userRole={getEffectiveUserRole(loggedUser)}
          accountMenuOpen={accountMenuOpen}
          onAccountMenuToggle={() => setAccountMenuOpen((value) => !value)}
          onAccountOpen={() => {
            setAccountMenuOpen(false)
            setScreen('account')
          }}
          onLogout={handleLogout}
          onAdminClick={() => {
            setScreen('admin')
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/admin')
            }
          }}
        />
        <main key={`login-${pageTransitionKey}`} className={`main-content page-transition-panel ${isPageChanging ? 'is-transitioning' : ''}`} dir="rtl">
          {renderDynamicPage()}
        </main>
        <Footer settings={siteData.settings} />
        <LoginPage onClose={() => setScreen('home')} onLogin={handleLogin} />
      </div>
    )
  }

  if (screen === 'admin') {
    return (
      <AdminPanel
        user={loggedUser}
        data={siteData}
        activityLog={activityLog}
        onDataChange={setSiteData}
        onActivityAdd={handleAddActivity}
        onActivityDelete={handleDeleteActivity}
        onDeleteAllActivities={handleDeleteAllActivities}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'account') {
    const accountName = loggedUser?.name || loggedUser?.username || 'مستخدم'
    const accountEmail = loggedUser?.email || 'غير متوفر'
    const accountRole = loggedUser?.role || 'عضو'
    const accountHandle = `@${(accountName || 'user').toLowerCase().replace(/\s+/g, '')}`
    const accountJoinDate = getDiscordJoinDate(loggedUser)
    const accountPresence = getDiscordPresenceText(loggedUser?.status)
    const accountPresenceColor = getDiscordPresenceColor(loggedUser?.status)

    return (
      <div className="app-shell">
        <Navbar
          pages={visiblePages}
          settings={siteData.settings}
          onLoginClick={() => setScreen('login')}
          currentPage={currentPage}
          onPageSelect={handlePageSelect}
          loggedUser={loggedUser}
          userRole={getEffectiveUserRole(loggedUser)}
          accountMenuOpen={accountMenuOpen}
          onAccountMenuToggle={() => setAccountMenuOpen((value) => !value)}
          onAccountOpen={() => {
            setAccountMenuOpen(false)
            setScreen('account')
          }}
          onLogout={handleLogout}
          onAdminClick={() => {
            setScreen('admin')
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/admin')
            }
          }}
        />
        <main key={`account-${pageTransitionKey}`} className={`main-content account-page-shell page-transition-panel ${isPageChanging ? 'is-transitioning' : ''}`} dir="rtl">
          <section className="account-profile-card">
            <div className="account-profile-header">
              <div className="account-avatar-shell">
                <img src={buildDiscordAvatar(loggedUser)} alt={accountName} className="account-profile-avatar" />
                <span
                  className="account-online-dot"
                  aria-label={accountPresence}
                  style={{ background: accountPresenceColor, boxShadow: `0 0 0 8px ${accountPresenceColor}22` }}
                />
              </div>

              <div className="account-header-copy">
                <span className="account-label">حسابك الشخصي</span>
                <h2>{accountName}</h2>
                <p className="account-subtitle">{accountHandle}</p>
                <div className="account-badges">
                  <span className="account-badge accent">{accountRole}</span>
                  <span className="account-badge">DETROIT STATE</span>
                </div>
              </div>
            </div>

            <div className="account-summary-bar">
              <div>
                <span>حالة الحساب</span>
                <strong>{accountPresence}</strong>
              </div>
              <div>
                <span>نوع العضوية</span>
                <strong>{accountRole}</strong>
              </div>
              <div>
                <span>تاريخ الانضمام</span>
                <strong>{accountJoinDate}</strong>
              </div>
            </div>

            <div className="account-grid">
              <div className="account-meta-row">
                <span>اسم المستخدم</span>
                <strong>{accountName}</strong>
              </div>
              <div className="account-meta-row">
                <span>البريد الإلكتروني</span>
                <strong>{accountEmail}</strong>
              </div>
              <div className="account-meta-row">
                <span>نوع الحساب</span>
                <strong>{accountRole}</strong>
              </div>
              <div className="account-meta-row">
                <span>الحالة</span>
                <strong>{accountPresence}</strong>
              </div>
            </div>

            <div className="account-actions">
              <button type="button" className="account-primary-btn" onClick={() => setScreen('home')}>العودة للرئيسية</button>
              <button type="button" className="account-secondary-btn" onClick={handleLogout}>تسجيل الخروج</button>
            </div>
          </section>
        </main>
        <Footer settings={siteData.settings} />
      </div>
    )
  }

  if (appLoading) {
    return (
      <div className="app-loader-shell" aria-live="polite" aria-busy="true">
        <div className="loader-orbit loader-orbit-one" />
        <div className="loader-orbit loader-orbit-two" />

        <div className="app-loader-center">
          <div className="loader-mark-wrap">
            <div className="loader-glow" />
            <img src="/img/DS.webp" alt="Detroit State logo" className="loader-mark" />
          </div>

          <div className="loader-brand">DETROIT STATE</div>
          <div className="loader-season">SEASON 1</div>

          <div className="loader-status" aria-label="Loading">
            <span>LOADING</span>
            <div className="loader-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Navbar
        pages={visiblePages}
        settings={siteData.settings}
        onLoginClick={() => setScreen('login')}
        currentPage={currentPage}
        onPageSelect={handlePageSelect}
        loggedUser={loggedUser}
        userRole={getEffectiveUserRole(loggedUser)}
        accountMenuOpen={accountMenuOpen}
        onAccountMenuToggle={() => setAccountMenuOpen((value) => !value)}
        onAccountOpen={() => {
          setAccountMenuOpen(false)
          setScreen('account')
        }}
        onLogout={handleLogout}
        onAdminClick={() => {
          setScreen('admin')
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/admin')
          }
        }}
      />
      <main key={`home-${pageTransitionKey}`} className={`main-content page-transition-panel ${isPageChanging ? 'is-transitioning' : ''}`} dir="rtl">
        {renderDynamicPage()}
      </main>
      <Footer settings={siteData.settings} />
    </div>
  )
}
