// Pure, view-agnostic filter/sort/group logic for database-style views (table/board).
// Operates over already-fetched row records; the UI never re-implements these rules.
// Scale note: single-firm data — in-memory over the fetched set is fine.
// ponytail: if a project ever holds tens of thousands of tickets, push filters to the query.

export type FilterOp = 'is' | 'is_not' | 'contains' | 'before' | 'after' | 'is_empty' | 'is_set'
export type FilterCondition = { field: string; op: FilterOp; value?: string }
export type SortSpec = { field: string; dir: 'asc' | 'desc' }

type Row = Record<string, unknown>

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

export function matchesCondition(row: Row, c: FilterCondition): boolean {
  const raw = row[c.field]
  const s = str(raw)
  const v = c.value ?? ''
  switch (c.op) {
    case 'is': return s === v
    case 'is_not': return s !== v
    case 'contains': return s.toLowerCase().includes(v.toLowerCase())
    case 'before': return s !== '' && s < v
    case 'after': return s !== '' && s > v
    case 'is_empty': return s === ''
    case 'is_set': return s !== ''
    default: return true
  }
}

// AND across all conditions.
export function applyFilters<T extends Row>(rows: T[], conditions: FilterCondition[]): T[] {
  if (conditions.length === 0) return rows
  return rows.filter((r) => conditions.every((c) => matchesCondition(r, c)))
}

// Stable sort; empty/null values sort last regardless of direction.
export function applySort<T extends Row>(rows: T[], sort: SortSpec | null): T[] {
  if (!sort) return rows
  const dir = sort.dir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const av = str(a[sort.field]), bv = str(b[sort.field])
    if (av === bv) return 0
    if (av === '') return 1
    if (bv === '') return -1
    return av < bv ? -dir : dir
  })
}

// Groups keyed by String(field); key order follows first appearance. Empty → 'None'.
export function groupBy<T extends Row>(rows: T[], field: string): { key: string; rows: T[] }[] {
  const order: string[] = []
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const key = str(r[field]) || 'None'
    if (!map.has(key)) { map.set(key, []); order.push(key) }
    map.get(key)!.push(r)
  }
  return order.map((key) => ({ key, rows: map.get(key)! }))
}
