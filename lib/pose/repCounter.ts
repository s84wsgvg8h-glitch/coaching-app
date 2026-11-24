import type { MovementPattern, PoseChannel } from "@/lib/pose/movementPattern";

export const CHANNEL_MIN_RANGE: Record<PoseChannel, number> = {
  knee: 32,
  hip: 26,
  elbow: 30,
  shoulder: 24,
  ankle: 16,
};

const CHANNELS: PoseChannel[] = ["knee", "hip", "elbow", "shoulder", "ankle"];
const REVERSAL_DEGREES = 9;
const TOP_DWELL_MS = 140;
const MIN_REP_GAP_MS = 380;
const OUTLIER_DEGREES = 45;
const SMOOTHING = 0.42;

export type RepCounterState = {
  reps: number;
  smoothed: number | null;
  phase: "find-direction" | "descending" | "ascending";
  anchor: number;
  extreme: number;
  extremeAt: number;
  valley: number | null;
  countedAscent: boolean;
  lastRepAt: number;
  span: number;
};

export type MovementCounterState = {
  channels: Record<PoseChannel, RepCounterState>;
  locked: PoseChannel | null;
  active: PoseChannel | null;
  reps: number;
};

export function createRepCounterState(): RepCounterState {
  return {
    reps: 0,
    smoothed: null,
    phase: "find-direction",
    anchor: 0,
    extreme: 0,
    extremeAt: 0,
    valley: null,
    countedAscent: false,
    lastRepAt: 0,
    span: 0,
  };
}

export function createMovementCounter(): MovementCounterState {
  return {
    channels: {
      knee: createRepCounterState(),
      hip: createRepCounterState(),
      elbow: createRepCounterState(),
      shoulder: createRepCounterState(),
      ankle: createRepCounterState(),
    },
    locked: null,
    active: null,
    reps: 0,
  };
}

export function stepRepCounter(
  state: RepCounterState,
  value: number | null,
  timestamp: number,
  minRange: number,
): RepCounterState {
  if (value == null || !Number.isFinite(value)) return state;

  if (state.smoothed != null && Math.abs(value - state.smoothed) > OUTLIER_DEGREES) {
    return state;
  }

  const smoothed =
    state.smoothed == null ? value : state.smoothed + SMOOTHING * (value - state.smoothed);

  if (state.smoothed == null) {
    return {
      ...state,
      smoothed,
      anchor: smoothed,
      extreme: smoothed,
      extremeAt: timestamp,
    };
  }

  const next: RepCounterState = { ...state, smoothed };

  if (next.phase === "find-direction") {
    if (smoothed <= next.anchor - REVERSAL_DEGREES) {
      next.phase = "descending";
      next.extreme = smoothed;
      next.extremeAt = timestamp;
    } else if (smoothed >= next.anchor + REVERSAL_DEGREES) {
      next.phase = "ascending";
      next.valley = next.anchor;
      next.extreme = smoothed;
      next.extremeAt = timestamp;
      next.countedAscent = false;
    }
    next.span = Math.max(next.span, Math.abs(smoothed - next.anchor));
    return next;
  }

  if (next.phase === "descending") {
    if (smoothed < next.extreme) {
      next.extreme = smoothed;
      next.extremeAt = timestamp;
    } else if (smoothed >= next.extreme + REVERSAL_DEGREES) {
      next.valley = next.extreme;
      next.phase = "ascending";
      next.extreme = smoothed;
      next.extremeAt = timestamp;
      next.countedAscent = false;
    }
    next.span = Math.max(next.span, spanOf(next));
    return next;
  }

  if (smoothed > next.extreme) {
    next.extreme = smoothed;
    next.extremeAt = timestamp;
  }

  const valley = next.valley ?? next.anchor;
  const rise = next.extreme - valley;

  if (
    !next.countedAscent &&
    rise >= minRange &&
    timestamp - next.extremeAt >= TOP_DWELL_MS &&
    smoothed >= next.extreme - 6 &&
    canCount(next, timestamp)
  ) {
    countRep(next, timestamp);
  }

  if (smoothed <= next.extreme - REVERSAL_DEGREES) {
    if (!next.countedAscent && rise >= minRange && canCount(next, timestamp)) {
      countRep(next, timestamp);
    }
    next.phase = "descending";
    next.extreme = smoothed;
    next.extremeAt = timestamp;
    next.countedAscent = false;
  }

  next.span = Math.max(next.span, spanOf(next));
  return next;
}

export function flushRepCounter(
  state: RepCounterState,
  timestamp: number,
  minRange: number,
) {
  if (state.phase !== "ascending" || state.countedAscent || state.valley == null) {
    return state;
  }

  const rise = state.extreme - state.valley;
  if (rise < minRange || !canCount(state, timestamp)) return state;

  const next = { ...state };
  countRep(next, timestamp);
  return next;
}

export function stepMovementCounter(
  state: MovementCounterState,
  samples: Partial<Record<PoseChannel, number | null>>,
  timestamp: number,
  pattern: MovementPattern,
): MovementCounterState {
  const preferred = pattern === "auto" ? null : pattern;
  const channels = { ...state.channels };

  if (preferred) {
    channels[preferred] = stepRepCounter(
      state.channels[preferred],
      samples[preferred] ?? null,
      timestamp,
      CHANNEL_MIN_RANGE[preferred],
    );

    return {
      channels,
      locked: preferred,
      active: preferred,
      reps: channels[preferred].reps,
    };
  }

  for (const channel of CHANNELS) {
    channels[channel] = stepRepCounter(
      state.channels[channel],
      samples[channel] ?? null,
      timestamp,
      CHANNEL_MIN_RANGE[channel],
    );
  }

  const locked =
    state.locked && channels[state.locked].reps > 0
      ? state.locked
      : leadingRepChannel(channels);
  const active = locked ?? leadingRangeChannel(channels);

  return {
    channels,
    locked,
    active,
    reps: locked ? channels[locked].reps : 0,
  };
}

export function flushMovementCounter(
  state: MovementCounterState,
  timestamp: number,
  pattern: MovementPattern,
) {
  const channel = pattern === "auto" ? state.locked ?? state.active : pattern;
  if (!channel) return state;

  const flushed = flushRepCounter(
    state.channels[channel],
    timestamp,
    CHANNEL_MIN_RANGE[channel],
  );

  if (flushed === state.channels[channel]) return state;

  return {
    ...state,
    channels: {
      ...state.channels,
      [channel]: flushed,
    },
    locked: pattern === "auto" ? channel : pattern,
    active: channel,
    reps: flushed.reps,
  };
}

function countRep(state: RepCounterState, timestamp: number) {
  state.reps += 1;
  state.lastRepAt = timestamp;
  state.countedAscent = true;
}

function canCount(state: RepCounterState, timestamp: number) {
  return state.lastRepAt === 0 || timestamp - state.lastRepAt >= MIN_REP_GAP_MS;
}

function spanOf(state: RepCounterState) {
  const valley = state.valley ?? state.anchor;
  return Math.abs(state.extreme - valley);
}

function leadingRepChannel(channels: Record<PoseChannel, RepCounterState>) {
  let best: PoseChannel | null = null;

  for (const channel of CHANNELS) {
    const reps = channels[channel].reps;
    if (reps <= 0) continue;
    if (
      !best ||
      reps > channels[best].reps ||
      (reps === channels[best].reps && channels[channel].span > channels[best].span)
    ) {
      best = channel;
    }
  }

  return best;
}

function leadingRangeChannel(channels: Record<PoseChannel, RepCounterState>) {
  let best: PoseChannel | null = null;
  let bestScore = 0.65;

  for (const channel of CHANNELS) {
    const score = channels[channel].span / CHANNEL_MIN_RANGE[channel];
    if (score > bestScore) {
      bestScore = score;
      best = channel;
    }
  }

  return best;
}
