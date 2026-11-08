import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
 * tailwind-merge only knows Tailwind's stock scale names. Without this it
 * reads `text-meta` as a colour and drops it next to `text-ink-3` (and
 * `shadow-led` next to a shadow colour, and so on). Keep these lists in step
 * with the @theme blocks in styles/theme.css.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['micro', 'caption', 'meta', 'small', 'body', 'lead', 'title'],
      radius: ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'sheet', 'full'],
      shadow: ['led', 'window', 'chip-on', 'pressed', 'selected', 'sheet', 'lit', 'pip', 'rest'],
      font: ['ui', 'mono'],
      ease: ['soft', 'sheet'],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs))
}
