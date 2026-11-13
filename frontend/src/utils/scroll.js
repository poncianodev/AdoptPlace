export function preferredScrollBehavior() {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    return 'auto'
  }
  return 'smooth'
}

