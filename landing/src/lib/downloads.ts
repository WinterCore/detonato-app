/*
 * The app outside the stores: the APK and the IPA on the repository's latest
 * GitHub release, and the web version on its own site. Every release carries
 * the files under the same names (`pnpm downloads` builds them), so these
 * links always reach the newest one.
 */

export const REPO_URL = 'https://github.com/WinterCore/detonato-app'
export const WEB_APP_URL = 'https://detonato-app.wintercore.xyz'

const LATEST = `${REPO_URL}/releases/latest/download`

export const DOWNLOADS = {
  android: { href: `${LATEST}/detonato.apk`, meta: 'APK' },
  iphone: { href: `${LATEST}/detonato.ipa`, meta: 'IPA' },
}
