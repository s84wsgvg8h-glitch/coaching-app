export function scrollFieldIntoVisibleArea(
  target: HTMLElement,
  scrollContainer: HTMLElement,
) {
  const run = () => {
    const viewport = window.visualViewport;
    const padding = 16;
    const targetRect = target.getBoundingClientRect();

    if (viewport) {
      const visibleTop = viewport.offsetTop + padding;
      const visibleBottom = viewport.offsetTop + viewport.height - padding;

      if (targetRect.bottom > visibleBottom) {
        scrollContainer.scrollTop += targetRect.bottom - visibleBottom;
      } else if (targetRect.top < visibleTop) {
        scrollContainer.scrollTop -= visibleTop - targetRect.top;
      }
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    if (targetRect.bottom > containerRect.bottom - padding) {
      scrollContainer.scrollTop +=
        targetRect.bottom - containerRect.bottom + padding;
    } else if (targetRect.top < containerRect.top + padding) {
      scrollContainer.scrollTop -= containerRect.top + padding - targetRect.top;
    }
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}
