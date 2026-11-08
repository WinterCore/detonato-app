/*
 * The app outside the stores: the files `pnpm downloads` writes to
 * public/downloads/, and the web version on its own site. Sizes are read
 * from the files at build time.
 */
import { statSync } from 'node:fs'
import { join } from 'node:path'

export const WEB_APP_URL = 'https://detonato-app.wintercore.xyz'

/** «5.8 MB», or nothing when the file isn't there (a fresh clone before `pnpm downloads`). */
function sizeOf(file: string): string | null {
  try {
    const bytes = statSync(join(process.cwd(), 'public/downloads', file)).size
    return `${(bytes / 1_000_000).toFixed(1)} MB`
  } catch {
    return null
  }
}

/** «APK · 5.8 MB». */
function meta(kind: string, file: string): string {
  const size = sizeOf(file)
  if (!size) {
    return kind
  }
  return `${kind} · ${size}`
}

export const DOWNLOADS = {
  android: { href: '/downloads/detonato.apk', meta: meta('APK', 'detonato.apk') },
  iphone: { href: '/downloads/detonato.ipa', meta: meta('IPA', 'detonato.ipa') },
}
