'use client'
import { useState, useTransition } from 'react'
import { toggleFavorite, type EntityType } from '@/app/(app)/workspace-actions'

// Star toggle. Optimistic; the sidebar Favorites section reconciles on next navigation.
export function FavoriteButton({ entityType, entityId, initial }: {
  entityType: EntityType; entityId: string; initial: boolean
}) {
  const [fav, setFav] = useState(initial)
  const [, start] = useTransition()
  return (
    <button
      aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={fav}
      onClick={() => { const next = !fav; setFav(next); start(() => { toggleFavorite(entityType, entityId) }) }}
      className={`rounded px-1.5 py-0.5 text-sm transition-colors ${fav ? 'text-primary' : 'text-ink-faint hover:text-ink'}`}
    >
      {fav ? '★' : '☆'}
    </button>
  )
}
