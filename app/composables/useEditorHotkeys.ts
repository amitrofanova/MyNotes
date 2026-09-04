export interface EditorHotkeyEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  target: EventTarget | null
  preventDefault: () => void
}

export interface EditorHotkeyHandlers {
  undo: () => void
  redo: () => void
  hasUncommittedText: () => boolean
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object') {
    return false
  }

  const element = target as { tagName?: string, isContentEditable?: boolean }
  const tag = element.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || element.isContentEditable === true
}

export function useEditorHotkeys(handlers: EditorHotkeyHandlers) {
  function handleKeydown(event: EditorHotkeyEvent): boolean {
    const modifier = event.ctrlKey || event.metaKey
    if (!modifier || event.key.toLowerCase() !== 'z') {
      return false
    }

    if (handlers.hasUncommittedText() && isTypingTarget(event.target)) {
      return false
    }

    event.preventDefault()
    if (event.shiftKey) {
      handlers.redo()
    }
    else {
      handlers.undo()
    }

    return true
  }

  return { handleKeydown }
}
