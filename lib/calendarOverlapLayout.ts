export type TimedEventLayoutInput = {
  id: string;
  startHour: number;
  endHour: number;
};

export type TimedEventLayoutOutput = TimedEventLayoutInput & {
  column: number;
  totalColumns: number;
};

export function layoutOverlappingEvents(
  events: TimedEventLayoutInput[],
): TimedEventLayoutOutput[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort(
    (a, b) => a.startHour - b.startHour || a.endHour - b.endHour,
  );

  const clusters: TimedEventLayoutInput[][] = [];
  let currentCluster: TimedEventLayoutInput[] = [];
  let clusterEnd = -1;

  for (const event of sorted) {
    if (currentCluster.length === 0 || event.startHour < clusterEnd) {
      currentCluster.push(event);
      clusterEnd = Math.max(clusterEnd, event.endHour);
      continue;
    }

    clusters.push(currentCluster);
    currentCluster = [event];
    clusterEnd = event.endHour;
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: TimedEventLayoutOutput[] = [];

  for (const cluster of clusters) {
    const columns: TimedEventLayoutInput[][] = [];

    for (const event of cluster) {
      let placed = false;

      for (const column of columns) {
        const last = column[column.length - 1];
        if (last.endHour <= event.startHour) {
          column.push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([event]);
      }
    }

    const totalColumns = columns.length;

    columns.forEach((column, columnIndex) => {
      column.forEach((event) => {
        result.push({ ...event, column: columnIndex, totalColumns });
      });
    });
  }

  return result;
}

export function getOverlappingBlockStyle(
  dayIndex: number,
  dayCount: number,
  column: number,
  totalColumns: number,
) {
  const dayLeft = `calc(56px + ((100% - 56px) / ${dayCount}) * ${dayIndex} + 2px)`;
  const dayWidth = `calc((100% - 56px) / ${dayCount} - 4px)`;
  const width = `calc((${dayWidth}) / ${totalColumns} - 2px)`;
  const left = `calc(${dayLeft} + (${dayWidth}) / ${totalColumns} * ${column} + 1px)`;

  return { left, width };
}
