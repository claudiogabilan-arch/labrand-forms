'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  href?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Logo({ href = '/', size = 'md', className }: LogoProps) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  const content = (
    <span
      className={cn(
        sizes[size],
        'font-bold tracking-tight text-slate-900',
        'hover:text-amber-700 transition-colors',
        className
      )}
    >
      LABrand
      <span className="font-medium text-amber-600"> Forms</span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded">
        {content}
      </Link>
    )
  }

  return content
}
