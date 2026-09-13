import { describe, it, expect } from 'vitest'
import { parseBlocks, blocksToPlainText } from '@/lib/blocks'

describe('parseBlocks', () => {
  it('keeps valid blocks and drops junk', () => {
    const blocks = parseBlocks([
      { type: 'heading', text: 'Title', level: 2 },
      { type: 'paragraph', text: 'Body' },
      { type: 'todo', text: 'Do it', checked: true },
      { type: 'bogus', text: 'nope' },
      null,
      'string',
      { type: 'bullet' }, // missing text → text defaults to ''
    ])
    expect(blocks).toHaveLength(4)
    expect(blocks[0]).toEqual({ type: 'heading', text: 'Title', level: 2 })
    expect(blocks[2]).toEqual({ type: 'todo', text: 'Do it', checked: true })
    expect(blocks[3]).toEqual({ type: 'bullet', text: '' })
  })

  it('returns [] for non-arrays', () => {
    expect(parseBlocks(null)).toEqual([])
    expect(parseBlocks({})).toEqual([])
    expect(parseBlocks('x')).toEqual([])
  })
})

describe('blocksToPlainText', () => {
  it('joins non-empty text by newline', () => {
    expect(blocksToPlainText(parseBlocks([
      { type: 'heading', text: 'A' },
      { type: 'paragraph', text: '' },
      { type: 'paragraph', text: 'B' },
    ]))).toBe('A\nB')
  })
})
