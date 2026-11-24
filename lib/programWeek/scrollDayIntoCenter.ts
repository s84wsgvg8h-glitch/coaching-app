const PROGRAM_WEEK_SCROLL_SELECTOR =
  ".mobile-page-shell__body--scroll, .athlete-program-main-scroll, .athlete-program-shell > main.mobile-scroll";

/** Reset vertical scroll so block/week nav stays visible at the top. */
export function resetProgramWeekScrollContainers() {
  if (typeof document === "undefined") return;

  document.querySelectorAll(PROGRAM_WEEK_SCROLL_SELECTOR).forEach((node) => {
    if (node instanceof HTMLElement) {
      node.scrollTop = 0;
    }
  });
}

/** Center an athlete day column inside the horizontal days scroller. */
export function scrollAthleteDayIntoCenter(
  dayElement: HTMLElement,
  gridElement: HTMLElement,
  behavior: ScrollBehavior = "auto",
  manageSnap = true,
) {
  const gridRect = gridElement.getBoundingClientRect();
  const dayRect = dayElement.getBoundingClientRect();
  const gridCenter = gridRect.left + gridRect.width / 2;
  const dayCenter = dayRect.left + dayRect.width / 2;
  const delta = dayCenter - gridCenter;
  const instant = behavior === "auto";
  const controlSnap = instant && manageSnap;
  const previousSnap = controlSnap ? gridElement.style.scrollSnapType : "";

  if (controlSnap) {
    // iOS scroll-snap fights the first scrollLeft assignment and visibly jumps.
    gridElement.style.scrollSnapType = "none";
  }

  const restoreSnap = () => {
    if (controlSnap) gridElement.style.scrollSnapType = previousSnap;
  };

  if (Math.abs(delta) < 1) {
    restoreSnap();
    return;
  }

  const targetLeft = gridElement.scrollLeft + delta;

  // Direct assignment avoids a visible scroll animation on first paint.
  if (instant) {
    gridElement.scrollLeft = targetLeft;
    if (controlSnap) requestAnimationFrame(restoreSnap);
    return;
  }

  gridElement.scrollTo({
    left: targetLeft,
    behavior,
  });
}

function isAthleteDayRoughlyCentered(
  dayElement: HTMLElement,
  gridElement: HTMLElement,
) {
  const gridRect = gridElement.getBoundingClientRect();
  const dayRect = dayElement.getBoundingClientRect();
  const gridCenter = gridRect.left + gridRect.width / 2;
  const dayCenter = dayRect.left + dayRect.width / 2;

  return Math.abs(dayCenter - gridCenter) < 24;
}

/** Instant centering in layout; one auto correction frame if container size was not ready yet. */
export function scrollAthleteDayIntoCenterOnOpen(
  dayElement: HTMLElement,
  gridElement: HTMLElement,
) {
  const previousSnap = gridElement.style.scrollSnapType;
  gridElement.style.scrollSnapType = "none";
  scrollAthleteDayIntoCenter(dayElement, gridElement, "auto", false);

  requestAnimationFrame(() => {
    if (!isAthleteDayRoughlyCentered(dayElement, gridElement)) {
      scrollAthleteDayIntoCenter(dayElement, gridElement, "auto", false);
    }
    requestAnimationFrame(() => {
      gridElement.style.scrollSnapType = previousSnap;
    });
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
