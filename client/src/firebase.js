import { initializeApp } from 'firebase/app'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDQo6R_hXlERLzTA-xJ3Ky7WBm6_00o7T8',
  authDomain: 'detroit-ly.firebaseapp.com',
  projectId: 'detroit-ly',
  storageBucket: 'detroit-ly.firebasestorage.app',
  messagingSenderId: '881926767740',
  appId: '1:881926767740:web:bfc74ee8181a80ae4835f9'
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

export const activityCollection = collection(db, 'activityLog')
export const usersCollection = collection(db, 'users')
export const settingsCollection = collection(db, 'settings')
export const pagesCollection = collection(db, 'pages')
export const creatorsCollection = collection(db, 'creators')
export const newsCollection = collection(db, 'news')
export const shopProductsCollection = collection(db, 'shopProducts')

export const saveActivityToFirestore = async (entry) => {
  if (!entry?.user) return null

  const payload = {
    ...entry,
    avatar: entry.avatar || null,
    time: entry.time || new Date().toISOString()
  }

  try {
    const created = await addDoc(activityCollection, payload)
    return { ...payload, id: created.id }
  } catch (error) {
    console.warn('Firestore activity save failed:', error)
    return null
  }
}

export const deleteActivityFromFirestore = async (activityId) => {
  if (!activityId) return false

  try {
    await deleteDoc(doc(db, 'activityLog', String(activityId)))
    return true
  } catch (error) {
    console.warn('Firestore activity delete failed:', error)
    return false
  }
}

export const deleteAllActivitiesFromFirestore = async () => {
  try {
    const snapshot = await getDocs(activityCollection)
    await Promise.all(snapshot.docs.map((activityDoc) => deleteDoc(doc(db, 'activityLog', String(activityDoc.id)))))
    return true
  } catch (error) {
    console.warn('Firestore all-activity delete failed:', error)
    return false
  }
}

export const saveUserToFirestore = async (user) => {
  if (!user?.id) return null

  try {
    const existingRef = doc(db, 'users', String(user.id))
    const existingSnap = await getDoc(existingRef)
    const existingData = existingSnap.exists() ? existingSnap.data() : {}

    const existingLastSeen = existingData?.lastSeen ? new Date(existingData.lastSeen).getTime() : 0
    const now = Date.now()
    const shouldUpdateLastSeen = !existingData?.lastSeen || !existingLastSeen || (now - existingLastSeen) > 30000

    const payload = {
      id: String(user.id),
      name: user.name || 'User',
      email: user.email || `${(user.name || 'user').toLowerCase()}@discord`,
      role: user.role || 'Discord User',
      avatar: user.avatar || null,
      firstLoginAt: user.firstLoginAt || existingData.firstLoginAt || new Date().toISOString(),
      lastSeen: shouldUpdateLastSeen ? new Date().toISOString() : existingData.lastSeen || user.lastSeen || new Date().toISOString()
    }

    await setDoc(existingRef, payload)
    return payload
  } catch (error) {
    console.warn('Firestore user save failed:', error)
    return null
  }
}

export const saveUsersToFirestore = async (users) => {
  if (!Array.isArray(users)) return null

  try {
    const tasks = users.map(async (user) => {
      const existingRef = doc(db, 'users', String(user.id))
      const existingSnap = await getDoc(existingRef)
      const existingData = existingSnap.exists() ? existingSnap.data() : {}
      const existingLastSeen = existingData?.lastSeen ? new Date(existingData.lastSeen).getTime() : 0
      const now = Date.now()
      const shouldUpdateLastSeen = !existingData?.lastSeen || !existingLastSeen || (now - existingLastSeen) > 30000

      const payload = {
        id: String(user.id),
        name: user.name || 'User',
        email: user.email || `${(user.name || 'user').toLowerCase()}@discord`,
        role: user.role || 'Member',
        avatar: user.avatar || null,
        firstLoginAt: user.firstLoginAt || existingData.firstLoginAt || new Date().toISOString(),
        lastSeen: shouldUpdateLastSeen ? new Date().toISOString() : existingData.lastSeen || user.lastSeen || new Date().toISOString()
      }

      await setDoc(existingRef, payload)
      return payload
    })

    await Promise.all(tasks)
    return users
  } catch (error) {
    console.warn('Firestore users save failed:', error)
    return null
  }
}

export const saveSettingsToFirestore = async (settings) => {
  if (!settings) return null

  try {
    await setDoc(doc(db, 'settings', 'site'), settings)
    return settings
  } catch (error) {
    console.warn('Firestore settings save failed:', error)
    return null
  }
}

export const savePagesToFirestore = async (pages) => {
  if (!Array.isArray(pages)) return null

  try {
    await setDoc(doc(db, 'pages', 'list'), { items: pages })
    return pages
  } catch (error) {
    console.warn('Firestore pages save failed:', error)
    return null
  }
}

export const saveCreatorsToFirestore = async (creators) => {
  if (!Array.isArray(creators)) return null

  try {
    await setDoc(doc(db, 'creators', 'list'), { items: creators })
    return creators
  } catch (error) {
    console.warn('Firestore creators save failed:', error)
    return null
  }
}

export const saveNewsToFirestore = async (news) => {
  if (!Array.isArray(news)) return null

  try {
    await setDoc(doc(db, 'news', 'list'), { items: news })
    return news
  } catch (error) {
    console.warn('Firestore news save failed:', error)
    return null
  }
}

export const saveShopProductsToFirestore = async (products) => {
  if (!Array.isArray(products)) return null

  try {
    await setDoc(doc(db, 'shopProducts', 'list'), { items: products })
    return products
  } catch (error) {
    console.warn('Firestore shop products save failed:', error)
    return null
  }
}

export const getActivityFromFirestore = async (count = 20) => {
  try {
    const snapshot = await getDocs(query(activityCollection, orderBy('time', 'desc'), limit(count)))
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }))
  } catch (error) {
    console.warn('Firestore activity fetch failed:', error)
    return []
  }
}

export const getUsersFromFirestore = async () => {
  try {
    const snapshot = await getDocs(query(usersCollection, orderBy('lastSeen', 'desc')))
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }))
  } catch (error) {
    console.warn('Firestore users fetch failed:', error)
    return []
  }
}

export const getSettingsFromFirestore = async () => {
  try {
    const snapshot = await getDoc(doc(db, 'settings', 'site'))
    return snapshot.exists() ? snapshot.data() : null
  } catch (error) {
    console.warn('Firestore settings fetch failed:', error)
    return null
  }
}

export const getPagesFromFirestore = async () => {
  try {
    const snapshot = await getDoc(doc(db, 'pages', 'list'))
    return snapshot.exists() ? (snapshot.data()?.items || []) : []
  } catch (error) {
    console.warn('Firestore pages fetch failed:', error)
    return []
  }
}

export const getCreatorsFromFirestore = async () => {
  try {
    const snapshot = await getDoc(doc(db, 'creators', 'list'))
    return snapshot.exists() ? (snapshot.data()?.items || []) : []
  } catch (error) {
    console.warn('Firestore creators fetch failed:', error)
    return []
  }
}

export const getNewsFromFirestore = async () => {
  try {
    const snapshot = await getDoc(doc(db, 'news', 'list'))
    return snapshot.exists() ? (snapshot.data()?.items || []) : []
  } catch (error) {
    console.warn('Firestore news fetch failed:', error)
    return []
  }
}

export const getShopProductsFromFirestore = async () => {
  try {
    const snapshot = await getDoc(doc(db, 'shopProducts', 'list'))
    return snapshot.exists() ? (snapshot.data()?.items || []) : []
  } catch (error) {
    console.warn('Firestore shop products fetch failed:', error)
    return []
  }
}

export const loadSiteDataFromFirestore = async () => {
  const [settings, pages, creators, news] = await Promise.all([
    getSettingsFromFirestore(),
    getPagesFromFirestore(),
    getCreatorsFromFirestore(),
    getNewsFromFirestore()
  ])

  return {
    settings: settings || null,
    pages: pages || [],
    creators: creators || [],
    news: news || []
  }
}
