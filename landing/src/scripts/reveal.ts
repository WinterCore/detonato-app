/*
 * Lights what's marked `data-reveal` once it scrolls into view (`.lit`),
 * once. For less motion, CSS drops the transitions, so it just shows.
 *
 * And pauses what's marked `data-motion` while it's out of view (`.paused`):
 * an endless animation nobody sees still costs every frame.
 */

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue
      }
      entry.target.classList.add('lit')
      observer.unobserve(entry.target)
    }
  },
  { threshold: 0.35 },
)

document.querySelectorAll('[data-reveal]').forEach((el) => {
  observer.observe(el)
})

const motion = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    entry.target.classList.toggle('paused', !entry.isIntersecting)
  }
})

document.querySelectorAll('[data-motion]').forEach((el) => {
  motion.observe(el)
})
