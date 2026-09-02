import React from 'react'
import { FaDiscord, FaInstagram, FaTiktok, FaTwitch, FaYoutube, FaXTwitter, FaLink } from 'react-icons/fa6'

const groupMembersByRole = (members = []) => {
  const groups = {
    owners: [],
    founders: [],
    staff: []
  }

  for (const member of members) {
    const role = String(member?.group || member?.role || 'staff').trim().toLowerCase()

    if (role === 'owner' || role === 'owners' || role === 'DS owners' || role === 'owners team') {
      groups.owners.push(member)
    } else if (role === 'founder' || role === 'founders' || role === 'DS founders' || role === 'founders team') {
      groups.founders.push(member)
    } else {
      groups.staff.push(member)
    }
  }

  return groups
}

const makeInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'DS'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'DS'
}

const formatMemberLabel = (member) => {
  const raw = String(member?.title || member?.role || member?.position || '').trim()
  if (raw.toLowerCase() === 'founder' || raw.toLowerCase() === 'founders') return 'Developer'
  return raw || 'مستخدم'
}

const normalizeSocialLinks = (member) => {
  const links = Array.isArray(member?.socials) ? member.socials : []
  const legacyLinks = Array.isArray(member?.socialLinks) ? member.socialLinks : []
  const allLinks = [...links, ...legacyLinks]

  if (member?.socialUrl) allLinks.push({ url: member.socialUrl })
  if (member?.url) allLinks.push({ url: member.url })

  return allLinks
    .map((item) => {
      const url = typeof item === 'string' ? item.trim() : String(item?.url || item?.href || '').trim()
      if (!/^https?:\/\//i.test(url)) return null
      return { url, label: typeof item === 'string' ? '' : item?.label || '' }
    })
    .filter(Boolean)
}

const getSocialIcon = (url) => {
  const value = url.toLowerCase()
  if (value.includes('discord')) return FaDiscord
  if (value.includes('instagram')) return FaInstagram
  if (value.includes('tiktok')) return FaTiktok
  if (value.includes('twitch')) return FaTwitch
  if (value.includes('youtube')) return FaYoutube
  if (value.includes('twitter') || value.includes('x.com')) return FaXTwitter
  return FaLink
}

const getProfileUrl = (member) => {
  const value = String(member?.profileUrl || member?.profileLink || member?.url || '').trim()
  if (!value) return null
  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`
  return /^https?:\/\//i.test(normalized) ? normalized : null
}

export default function StaffPage({ staff = [] }) {
  const visibleMembers = [...staff]
    .filter((member) => member.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  const grouped = groupMembersByRole(visibleMembers)
  const ownerCards = grouped.owners.length ? grouped.owners : []
  const founderCards = grouped.founders.length ? grouped.founders : []
  const staffCards = grouped.staff.length ? grouped.staff : []

  const renderCard = (member, index) => {
    const safeImage = member.image || '/img/DS.webp'
    const roleLabel = formatMemberLabel(member)
    const socialLinks = normalizeSocialLinks(member)
    const profileUrl = getProfileUrl(member)
    const avatarStyle = member.image
      ? { backgroundImage: `url(${safeImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: 'linear-gradient(135deg, rgba(157, 77, 255, 0.22), rgba(17, 26, 38, 0.9))' }

    const cardContent = (
      <>
        {profileUrl ? <a href={profileUrl} target="_blank" rel="noreferrer" className="creator-link" aria-label={`ملف ${member.name || 'العضو'}`}><div className="staff-avatar creator-avatar" style={avatarStyle}>
          {!member.image && <span>{makeInitials(member.name)}</span>}
        </div></a> : <div className="staff-avatar creator-avatar" style={avatarStyle}>
          {!member.image && <span>{makeInitials(member.name)}</span>}
        </div>}
        <div className="staff-meta streamer-meta">
          {profileUrl ? <a href={profileUrl} target="_blank" rel="noreferrer" className="creator-link"><strong>{member.name || 'Unnamed'}</strong></a> : <strong>{member.name || 'Unnamed'}</strong>}
          <span className="staff-role">{roleLabel}</span>
          {socialLinks.length > 0 && (
            <div className="staff-socials" aria-label={`حسابات ${member.name || 'العضو'}`}>
              {socialLinks.map(({ url, label }, socialIndex) => {
                const Icon = getSocialIcon(url)
                return <a key={`${url}-${socialIndex}`} href={url} target="_blank" rel="noreferrer" aria-label={label || url} onClick={(event) => event.stopPropagation()}><Icon /></a>
              })}
            </div>
          )}
        </div>
      </>
    )

    return (
      <div className="staff-card" key={`${member.id || member.name || 'staff'}-${index}`}>
        <div className="staff-link">{cardContent}</div>
      </div>
    )
  }

  const renderSection = (title, items, mode = 'default') => {
    if (!items.length) return null

    return (
      <section className={`staff-section staff-section-${mode}`} key={title}>
        <div className="staff-section-header">
          <h3>{title}</h3>
        </div>
        <div className={`staff-grid staff-grid-${mode}`}>
          {items.map(renderCard)}
        </div>
      </section>
    )
  }

  if (!visibleMembers.length) {
    return (
      <section className="dynamic-page-shell staff-shell-empty">
        <div className="dynamic-page-card">
          <span className="rules-page-eyebrow">الإدارة</span>
          <h2>الطاقم الإداري</h2>
          <p>سيظهر هنا فريق الإدارة، المالكين، والمشرفين عند إضافة أول عضو.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="staff-page-shell">
      <div className="staff-page-hero hero-shell">
        <div className="staff-page-backdrop hero-background" aria-hidden="true" />
        <div className="staff-page-hero-inner">
          <span className="rules-page-eyebrow">الإدارة</span>
          <h1 className="staff-page-title">الفريق وراء ديترويت</h1>
          <p>تعرفوا على الفريق الإداري والتقني الذي يبني لكم أفضل تجربة في ديترويت.</p>
        </div>
      </div>

      {renderSection('DS Owners', ownerCards, 'owners')}
      {renderSection('DS Dev', founderCards, 'founders')}
      {renderSection('DS Staff', staffCards, 'staff')}
    </section>
  )
}
