/** Center an athlete day column inside the horizontal days scroller. */
export function scrollAthleteDayIntoCenter(
  dayElement: HTMLElement,
  gridElement: HTMLElement,
  behavior: ScrollBehavior = "auto",
) {
  const gridRect = gridElement.getBoundingClientRect();
  const dayRect = dayElement.getBoundingClientRect();
  const gridCenter = gridRect.left + gridRect.width / 2;
  const dayCenter = dayRect.left + dayRect.width / 2;
  const delta = dayCenter - gridCenter;

  if (Math.abs(delta) < 1) return;

  gridElement.scrollTo({
    left: gridElement.scrollLeft + delta,
    behavior,
  });
}

export function scrollAthleteDayIntoCenterAfterLayout(
  dayElement: HTMLElement,
  gridElement: HTMLElement,
  behavior: ScrollBehavior = "auto",
) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollAthleteDayIntoCenter(dayElement, gridElement, behavior);
    });
  });
}
