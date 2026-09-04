const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let lockCount = 0
let savedOverflow = ''
let savedPaddingRight = ''

function isVisible(element: HTMLElement): boolean {
  if (element.getClientRects().length === 0) {
    return false
  }

  const style = window.getComputedStyle(element)
  return style.visibility !== 'hidden' && style.display !== 'none'
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.closest('[inert]')) {
      return false
    }

    if (element.getAttribute('aria-hidden') === 'true') {
      return false
    }

    if (element.closest('fieldset[disabled]')) {
      return false
    }

    return isVisible(element)
  })
}

export function handleFocusTrapKeydown(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== 'Tab') {
    return
  }

  const focusable = getFocusableElements(container)
  if (focusable.length === 0) {
    event.preventDefault()
    container.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) {
    return
  }

  const active = document.activeElement

  if (event.shiftKey) {
    if (active === first || active === container || !container.contains(active)) {
      event.preventDefault()
      last.focus()
    }
    return
  }

  if (active === last) {
    event.preventDefault()
    first.focus()
  }
}

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') {
    return
  }

  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow
    savedPaddingRight = document.body.style.paddingRight
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`
    }
    document.documentElement.classList.add('app-modal-open')
  }

  lockCount += 1
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') {
    return
  }

  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) {
    return
  }

  document.body.style.overflow = savedOverflow
  document.body.style.paddingRight = savedPaddingRight
  document.documentElement.classList.remove('app-modal-open')
}

export function setAppInert(inert: boolean): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.getElementById('__nuxt')
  if (!root) {
    return
  }

  if (inert) {
    root.setAttribute('inert', '')
    return
  }

  if (lockCount === 0) {
    root.removeAttribute('inert')
  }
}
