import { describe, expect, it } from 'vitest'
import { noteDisplayTitle, UNTITLED_NOTE_LABEL } from '../../app/utils/noteTitle'

describe('noteDisplayTitle', () => {
  it('returns the title when it has visible text', () => {
    expect(noteDisplayTitle('Покупки')).toBe('Покупки')
  })

  it('shows the untitled label for empty or whitespace titles', () => {
    expect(noteDisplayTitle('')).toBe(UNTITLED_NOTE_LABEL)
    expect(noteDisplayTitle('   ')).toBe(UNTITLED_NOTE_LABEL)
  })
})
