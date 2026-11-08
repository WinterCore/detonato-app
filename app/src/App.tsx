import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Toaster } from '@/components/Toaster'
import { onEndTapped } from '@/lib/notifications'
import { useScrollToTop } from '@/navigation/back'
import { History } from '@/screens/history/views/History'
import { Settings } from '@/screens/settings/views/Settings'
import { StylePicker } from '@/screens/style/views/StylePicker'
import { Tasks } from '@/screens/tasks/views/Tasks'
import { Timer } from '@/screens/timer/views/Timer'
import { Today } from '@/screens/today/views/Today'

const Glyphs = lazy(() => import('@/dev/Glyphs'))

/** A session's notification, tapped: the app opens on the timer, whatever screen it was left on. */
function useEndTaps(): void {
  const navigate = useNavigate()
  useEffect(() => onEndTapped(() => navigate('/timer')), [navigate])
}

function Screens() {
  useScrollToTop()
  useEndTaps()
  return (
    <Routes>
      <Route path="/" element={<Today />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/history" element={<History />} />
      <Route path="/timer" element={<Timer />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/style" element={<StylePicker />} />
      {import.meta.env.DEV && (
        <Route
          path="/dev/glyphs"
          element={
            <Suspense>
              <Glyphs />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Screens />
      <Toaster />
    </BrowserRouter>
  )
}
