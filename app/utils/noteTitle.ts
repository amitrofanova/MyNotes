export const UNTITLED_NOTE_LABEL = 'Без названия'

export function noteDisplayTitle(title: string): string {
  return title.trim() || UNTITLED_NOTE_LABEL
}
