import React from 'react'
import {
  FaDiscord,
  FaFacebookF,
  FaTiktok,
  FaXTwitter,
  FaYoutube
} from 'react-icons/fa6'

const defaultQuickLinks = [
  { label: 'الرئيسية', href: '#/' },
  { label: 'القوانين', href: '#/rules' },
  { label: 'صفحات المجتمع', href: '#/streamers' },
  { label: 'التقييمات', href: '#/faq' }
]

const defaultSocialLinks = [
  { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@detroitstate?is_from_webapp=1&sender_device=pc', icon: 'tiktok' },
  { label: 'Discord', href: 'https://discord.gg/DSRP', icon: 'discord' },
  { label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' }
]

const detectSocialIcon = (href = '') => {
  const normalized = (href || '').toLowerCase()

  if (normalized.includes('facebook')) return 'facebook'
  if (normalized.includes('tiktok')) return 'tiktok'
  if (normalized.includes('discord')) return 'discord'
  if (normalized.includes('youtube') || normalized.includes('youtu.be')) return 'youtube'
  if (normalized.includes('x.com') || normalized.includes('twitter')) return 'x'
  return 'facebook'
}

const getSocialIcon = (iconName) => {
  const iconProps = { className: 'social-svg' }

  switch (iconName) {
    case 'facebook':
      return <FaFacebookF {...iconProps} />
    case 'tiktok':
      return <FaTiktok {...iconProps} />
    case 'discord':
      return <FaDiscord {...iconProps} />
    case 'youtube':
      return <FaYoutube {...iconProps} />
    case 'x':
      return <FaXTwitter {...iconProps} />
    default:
      return <FaFacebookF {...iconProps} />
  }
}

const normalizeQuickLinks = (value) => {
  const source = Array.isArray(value) && value.length ? value : defaultQuickLinks
  return source.map((item) => ({
    label: item.label || 'Link',
    href: item.href || '#',
    external: !!item.external
  }))
}

const normalizeSocialLinks = (value) => {
  const source = Array.isArray(value) && value.length ? value : defaultSocialLinks
  return source.map((item) => {
    const href = typeof item === 'string' ? item : (item?.href || '#')
    const icon = typeof item === 'string' ? detectSocialIcon(href) : (item?.icon || detectSocialIcon(href))

    return {
      label: typeof item === 'string' ? 'Social' : (item?.label || 'Social'),
      href,
      icon
    }
  })
}

export default function Footer({ settings = {} }) {
  const quickLinks = normalizeQuickLinks(settings.footerQuickLinks)
  const socialLinks = normalizeSocialLinks(settings.footerSocials)
  const footerLogo = settings.footerLogo || '/img/DS.webp'
  const footerTitle = settings.footerTitle || settings.siteName || 'مدينة العدالة'
  const footerDescription = settings.footerDescription || 'مجتمعنا هو مكان للعب والمرح والتفاعل مع المجتمع، حيث نلتقي للعب، والتنافس، وتبادل الخبرات داخل بيئة نظيفة واحترافية.'
  const footerCopyright = settings.footerCopyright || 'JUSTICE CITY DEV TEAM • 2026'
  const footerCopyrightLines = footerCopyright
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <footer className="newpixel-footer">
      <div className="newpixel-footer-inner">
        <div className="newpixel-footer-branding">
          <div className="newpixel-brand-row">
            <span className="newpixel-brand-mark">
              <img src={footerLogo} alt="DS logo" />
            </span>
          </div>
        </div>

        <div className="newpixel-socials">
          {socialLinks.map((item) => (
            <a key={`${item.label}-${item.href}`} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>
              {getSocialIcon(item.icon)}
            </a>
          ))}
        </div>

        <div className="newpixel-footer-links">
          <ul>
            {quickLinks.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <a href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noreferrer' : undefined}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="newpixel-footer-meta">
          <div className="newpixel-copyright">
            {footerCopyrightLines.length ? (
              footerCopyrightLines.map((line, index) => (
                <span key={`${line}-${index}`} className="copyright-line">{line}</span>
              ))
            ) : (
              <span className="copyright-line">{footerCopyright}</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
