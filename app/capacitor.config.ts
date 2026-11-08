import type { CapacitorConfig } from '@capacitor/cli'

/*
 * The native shell (iOS + Android) around the web build. `pnpm build`, then
 * `pnpm exec cap sync` copies dist/ into both projects. Native-only features
 * (a session's notification, saving a backup through the share sheet) check
 * `Capacitor.isNativePlatform()`. Hand edits to the projects: AGENTS.md ›
 * Native shells.
 */
const config: CapacitorConfig = {
  // Permanent once the app is published to a store.
  appId: 'xyz.wintercore.detonato',
  appName: 'Detonato',
  webDir: 'dist',
  // The app's ground behind the web view, so its first frame is never white.
  backgroundColor: '#0b0c0d',
}

export default config
