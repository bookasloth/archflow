'use client'
import { useEffect } from 'react'
import { recordView, type EntityType } from '@/app/(app)/workspace-actions'

// Records that the current user viewed this entity (feeds sidebar "Recent"). Fire-and-forget.
export function TrackView({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  useEffect(() => { recordView(entityType, entityId) }, [entityType, entityId])
  return null
}
