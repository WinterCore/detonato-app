import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { followDisplay } from '@/lib/applyDisplay'
import { followDay } from '@/lib/clock'
import { followSession } from '@/lib/session'
import { boot } from '@/state'
import App from './App.tsx'
import './index.css'

const root = createRoot(document.getElementById('root')!)

// iOS shows a touch as `:active` — every control's press — only on a page that listens for touches.
document.addEventListener('touchstart', () => {}, { passive: true })
// iOS pinches the page whatever the viewport says; its own gesture events can be stopped.
document.addEventListener('gesturestart', (e) => e.preventDefault())

/*
 * Load everything kept on this device — the settings, the session under way,
 * the tasks and their history — then render: screens never see a loading
 * state, and the first paint has the chosen colour and design. After that
 * `followDisplay` keeps <html> in step with the LED settings, `followSession`
 * does what a session does off its screen (its end, the notification, the
 * screen kept on), and `followDay` moves "today" on at midnight.
 */
async function start() {
  await boot()
  followDisplay()
  followSession()
  followDay()
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

start().catch((err: unknown) => {
  console.error(err)
  root.render(
    <main className="mx-auto grid min-h-dvh max-w-app place-content-center gap-2 px-6 text-center">
      <p className="text-lead text-ink">Detonato couldn’t open its data.</p>
      <p className="text-small text-ink-3">Close the app and open it again. If this keeps happening, the phone’s storage may be full.</p>
    </main>,
  )
})
