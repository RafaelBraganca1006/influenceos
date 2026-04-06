import { FaInstagram, FaYoutube } from 'react-icons/fa'
import { FaTiktok } from 'react-icons/fa6'

const PLATFORMS = {
  ig: {
    icon: FaInstagram,
    bg: 'linear-gradient(135deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d, #f56040, #f77737, #fcaf45)',
    color: 'white',
  },
  tt: {
    icon: FaTiktok,
    bg: '#010101',
    color: 'white',
  },
  yt: {
    icon: FaYoutube,
    bg: '#FF0000',
    color: 'white',
  },
}

export default function PlatformLogo({ platform, size = 22 }) {
  const cfg = PLATFORMS[platform]
  if (!cfg) return null
  const Icon = cfg.icon
  const radius = Math.round(size * 0.28)
  const iconSize = Math.round(size * 0.58)

  return (
    <div
      title={platform === 'ig' ? 'Instagram' : platform === 'tt' ? 'TikTok' : 'YouTube'}
      style={{
        width: size, height: size, borderRadius: radius,
        background: cfg.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={iconSize} color={cfg.color} />
    </div>
  )
}
