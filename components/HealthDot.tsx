import type { Health } from '@/lib/health'

const COLOR: Record<Health, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
}

export function HealthDot({ health }: { health: Health }) {
  return <span className={`inline-block h-3 w-3 rounded-full ${COLOR[health]}`} title={health} />
}
