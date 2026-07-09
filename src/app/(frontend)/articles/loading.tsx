import { Crest } from '@/components/site/Crest'

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex max-w-6xl flex-col items-center px-6 py-32 text-center"
    >
      <Crest className="h-12 w-auto animate-pulse text-parchment-300" />
      <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-ink-400">
        Consulting the archive…
      </p>
    </div>
  )
}
