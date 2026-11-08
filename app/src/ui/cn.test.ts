import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('keeps a type size next to an ink colour', () => {
    expect(cn('text-meta', 'text-ink-3')).toBe('text-meta text-ink-3')
  })

  it('lets a later size win', () => {
    expect(cn('text-body', 'text-meta')).toBe('text-meta')
  })

  it('keeps a shadow next to a ring colour', () => {
    expect(cn('shadow-led', 'border-led')).toBe('shadow-led border-led')
  })
})
