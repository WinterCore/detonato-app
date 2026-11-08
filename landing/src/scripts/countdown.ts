/*
 * The hero's countdown, as the app's timer runs one: on load every segment
 * sweeps on in order, then it counts down from 25:00 a second at a time,
 * its colon blinking, and starts over at the end. Each tick switches single
 * segments on or off from the design's digit map. For less motion, it
 * stays at 25:00.
 */

const START_S = 25 * 60
const TICK_MS = 1000
/** The sweep's length: the last digit's last segment, and its fade (segments.css › .sweep). */
const SWEEP_MS = 1400

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** «2459» for 24:59: the digits, one per slot. */
function digitsOf(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}${s}`
}

/** One second on; at the end, back to the start. */
function next(seconds: number): number {
  if (seconds <= 0) {
    return START_S
  }
  return seconds - 1
}

function show(root: HTMLElement, map: number[][], text: string): void {
  root.querySelectorAll<HTMLElement>('[data-slot]').forEach((slot, i) => {
    const on = new Set(map[Number(text[i])])
    slot.querySelectorAll<SVGGElement>('.lit > g').forEach((g) => {
      g.classList.toggle('on', on.has(Number(g.dataset.seg)))
    })
  })
}

function run(root: HTMLElement): void {
  const map = JSON.parse(root.dataset.countdown ?? '[]') as number[][]
  if (still() || map.length === 0) {
    return
  }
  // The sweep: every segment off at once, then on again in order. Two frames, so the dark state paints first.
  root.classList.add('blank')
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.replace('blank', 'sweep')
    })
  })
  let seconds = START_S
  window.setTimeout(() => {
    root.classList.remove('sweep')
    root.classList.add('blink')
    window.setInterval(() => {
      seconds = next(seconds)
      show(root, map, digitsOf(seconds))
    }, TICK_MS)
  }, SWEEP_MS)
}

const root = document.querySelector<HTMLElement>('[data-countdown]')
if (root) {
  run(root)
}
