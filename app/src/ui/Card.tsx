import type { HTMLAttributes } from 'react'
import { cn } from './cn'
import { panel } from './panel'

/** A panel on the ground. Rows inside it are divided by hairlines. Padding and layout come from `className`. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(panel(), 'divide-y divide-line', className)} {...rest} />
}
