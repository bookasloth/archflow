// Lightweight document block model. Docs store `content` as an ordered JSON array of blocks
// (no per-block DB table). parseBlocks validates untrusted jsonb into a known shape.

export type BlockType = 'heading' | 'paragraph' | 'todo' | 'bullet' | 'callout'
export type Block = {
  type: BlockType
  text: string
  level?: 1 | 2 | 3   // heading only
  checked?: boolean    // todo only
}

const TYPES: BlockType[] = ['heading', 'paragraph', 'todo', 'bullet', 'callout']

// Normalize arbitrary jsonb (or anything) into Block[]; drop malformed entries.
export function parseBlocks(content: unknown): Block[] {
  if (!Array.isArray(content)) return []
  const out: Block[] = []
  for (const item of content) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (!TYPES.includes(o.type as BlockType)) continue
    const block: Block = { type: o.type as BlockType, text: typeof o.text === 'string' ? o.text : '' }
    if (block.type === 'heading' && (o.level === 1 || o.level === 2 || o.level === 3)) block.level = o.level
    if (block.type === 'todo') block.checked = o.checked === true
    out.push(block)
  }
  return out
}

// Flatten to plain text for search/preview.
export function blocksToPlainText(blocks: Block[]): string {
  return blocks.map((b) => b.text).filter(Boolean).join('\n')
}
