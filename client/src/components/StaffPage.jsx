import React from 'react'

const groupMembersByRole = (members = []) => {
  const groups = {
    owners: [],
    founders: [],
    staff: []
  }

  for (const member of members) {
    const role = String(member?.group || member?.role || 'staff').trim().toLowerCase()

    if (role === 'owner' || role === 'owners' || role === 'mt owners' || role === 'owners team') {
      groups.owners.push(member)
    } else if (role === 'founder' || role === 'founders' || role === 'mt founders' || role === 'founders team') {
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
  return raw || 'مستخدم'
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
    const avatarStyle = member.image
      ? { backgroundImage: `url(${safeImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: 'linear-gradient(135deg, rgba(157, 77, 255, 0.22), rgba(17, 26, 38, 0.9))' }

    const link = member.url && /^https?:\/\//i.test(member.url) ? member.url : null

    const cardContent = (
      <>
        <div className="staff-avatar" style={avatarStyle}>
          {!member.image && <span>{makeInitials(member.name)}</span>}
        </div>
        <div className="staff-meta">
          <strong>{member.name || 'Unnamed'}</strong>
          <span>{member.username || roleLabel}</span>
          {member.account && <small>{member.account}</small>}
        </div>
      </>
    )

    return (
      <div className="staff-card" key={`${member.id || member.name || 'staff'}-${index}`}>
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="staff-link">
            {cardContent}
          </a>
        ) : (
          cardContent
        )}
      </div>
    )
  }

  const renderSection = (title, items, mode = 'default') => {
    if (!items.length) return null

    return (
      <section className="staff-section" key={title}>
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
          <span className="dynamic-page-badge">الطاقم الإداري</span>
          <h2>الطاقم الإداري</h2>
          <p>سيظهر هنا فريق الإدارة، المالكين، والمشرفين عند إضافة أول عضو.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="staff-page-shell">
      <div className="staff-page-hero">
        <div className="staff-page-hero-inner">
          <span className="eyebrow">DETROIT STATE</span>
          <h1>الفريق والرعاية</h1>
          <p>نحن فريق مخصص لضمان تجربة ممتعة وآمنة داخل المجتمع.</p>
        </div>
      </div>

      {renderSection('MT Owners', ownerCards, 'owners')}
      {renderSection('MT Founders', founderCards, 'founders')}
      {renderSection('Staff', staffCards, 'staff')}
    </section>
  )
}
