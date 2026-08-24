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

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

module.exports = {
  resolveUsableDate,
  formatLastSeen
}
