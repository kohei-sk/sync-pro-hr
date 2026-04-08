'use client'
import { usePathname } from 'next/navigation'

type WidthVariant = 'default' | 'narrow' | 'wide'

const WIDTH_CLASSES: Record<WidthVariant, string> = {
  default: 'max-w-4xl',
  narrow: 'max-w-3xl',
  wide: 'max-w-6xl',
}

// パスプレフィックスまたは完全一致で幅を指定
// より具体的なパスを上に書く（先勝ち）
const WIDTH_CONFIG: Array<{ match: string | RegExp; variant: WidthVariant }> = [
  { match: '/events/new', variant: 'narrow' },
  { match: /^\/events\/[^/]+$/, variant: 'narrow' },
  { match: '/bookings', variant: 'wide' },
  { match: '/settings', variant: 'narrow' },
]

function getVariant(pathname: string): WidthVariant {
  for (const { match, variant } of WIDTH_CONFIG) {
    if (typeof match === 'string' ? pathname === match || pathname.startsWith(match + '/') : match.test(pathname)) {
      return variant
    }
  }
  return 'default'
}

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const maxWidthClass = WIDTH_CLASSES[getVariant(pathname)]
  return (
    <div className={`w-full flex-1 px-8 pt-7 pb-8 ${maxWidthClass} mx-auto`}>
      {children}
    </div>
  )
}
