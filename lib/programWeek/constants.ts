export const DELETE_X_BTN =
  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[9px] leading-none text-white transition hover:bg-red-600";

export const COACH_CARD_DISMISS_BTN = `${DELETE_X_BTN} coach-program-card-dismiss absolute top-2 right-2 z-10`;

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
