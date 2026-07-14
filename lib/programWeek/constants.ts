export const DELETE_X_BTN =
  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[9px] leading-none text-white transition hover:bg-red-600";

export const COACH_CARD_DISMISS_BTN = `${DELETE_X_BTN} coach-program-card-dismiss absolute top-2 right-2 z-10`;

export function isExerciseCardDragBlockedTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) return true;

  return Boolean(
    target.closest(
      "input, textarea, select, button, a, label, [contenteditable='true']",
    ),
  );
}

export function setEmptyDragImage(event: React.DragEvent) {
  event.dataTransfer.effectAllowed = "move";
  const node = document.createElement("span");
  node.style.position = "fixed";
  node.style.top = "-9999px";
  node.style.opacity = "0";
  document.body.appendChild(node);
  event.dataTransfer.setDragImage(node, 0, 0);
  window.setTimeout(() => node.remove(), 0);
}

export function setDragPreviewFromElement(
  event: React.DragEvent,
  sourceElement: HTMLElement,
) {
  event.dataTransfer.effectAllowed = "move";

  const rect = sourceElement.getBoundingClientRect();
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.top = "-9999px";
  clone.style.left = "-9999px";
  clone.style.width = `${rect.width}px`;
  clone.style.maxWidth = `${rect.width}px`;
  clone.style.opacity = "0.94";
  clone.style.pointerEvents = "none";
  clone.style.transform = "rotate(1.5deg) scale(1.02)";
  clone.style.transformOrigin = "center center";
  clone.style.boxShadow = "0 24px 48px rgba(0, 0, 0, 0.38)";
  clone.style.borderRadius = "12px";
  clone.classList.add("coach-program-drag-preview");
  document.body.appendChild(clone);

  const offsetX = Math.min(
    Math.max(event.clientX - rect.left, 24),
    rect.width - 24,
  );
  const offsetY = Math.min(
    Math.max(event.clientY - rect.top, 24),
    rect.height - 24,
  );

  event.dataTransfer.setDragImage(clone, offsetX, offsetY);
  window.setTimeout(() => clone.remove(), 0);
}
