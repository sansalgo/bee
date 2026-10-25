/**
 * Whether a global game shortcut should ignore this keydown: the player is
 * typing into a field, or holding a modifier (so browser/OS shortcuts like
 * Ctrl+R keep working).
 */
export function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true
  const target = event.target
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
  )
}
