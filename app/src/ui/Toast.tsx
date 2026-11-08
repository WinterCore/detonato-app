/** One short line, risen over the bottom of the screen. */
export function Toast({ text }: { text: string }) {
  return (
    <div role="status" className="max-w-app animate-toast-in rounded-xl border border-edge bg-raised px-4 py-3 text-small text-ink">
      {text}
    </div>
  )
}
