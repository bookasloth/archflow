export type MaterialStatus = 'proposed' | 'approved' | 'rejected'

const TRANSITIONS: Record<MaterialStatus, MaterialStatus[]> = {
  proposed: ['approved', 'rejected'],
  approved: ['proposed'],
  rejected: ['proposed'],
}

export function nextMaterialStatuses(status: MaterialStatus): MaterialStatus[] {
  return TRANSITIONS[status]
}

export function categoryLabel(category: string): string {
  const spaced = category.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
