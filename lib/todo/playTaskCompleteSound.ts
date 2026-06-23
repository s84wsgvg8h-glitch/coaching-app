let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedContext) {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

/**
 * Soft completion tick (~0.25s). Tune volume (0.12–0.18) or frequencies here.
 */
export function playTaskCompleteSound(volume = 0.15) {
  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const now = ctx.currentTime;
  const duration = 0.26;

  const tone = ctx.createOscillator();
  const toneGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  tone.type = "sine";
  tone.frequency.setValueAtTime(920, now);
  tone.frequency.exponentialRampToValueAtTime(640, now + 0.09);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, now);

  toneGain.gain.setValueAtTime(0.0001, now);
  toneGain.gain.linearRampToValueAtTime(volume, now + 0.006);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  tone.connect(filter);
  filter.connect(toneGain);
  toneGain.connect(ctx.destination);
  tone.start(now);
  tone.stop(now + duration);

  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = "triangle";
  click.frequency.setValueAtTime(1100, now);
  clickGain.gain.setValueAtTime(0.0001, now);
  clickGain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.003);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
  click.connect(clickGain);
  clickGain.connect(ctx.destination);
  click.start(now);
  click.stop(now + 0.06);
}
