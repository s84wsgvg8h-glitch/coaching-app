export const TASK_COMPLETE_ANIMATION_MS = 420;
export const TASK_COMPLETE_SOUND_DELAY_MS = 80;
export const TASK_DONE_ENTER_MS = 320;

export function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
