import type { AnchorHTMLAttributes } from 'react'
import { cn } from './cn'

/**
 * A link inside a line of text, to a site outside the app: a new tab on the
 * web; in the apps, Capacitor hands it to the phone's browser.
 */
export function TextLink({ className, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a target="_blank" rel="noreferrer" className={cn('text-ink-2 underline decoration-line underline-offset-4', className)} {...rest} />
}
