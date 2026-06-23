/** True when the user is typing in a field — skip global shortcuts (Space, arrows, etc.). */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  if (target.isContentEditable) return true;

  return target.closest(
    "input, textarea, select, [contenteditable='true']",
  ) !== null;
}
