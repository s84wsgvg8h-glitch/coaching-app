type ToastListener = (message: string) => void;

let listener: ToastListener | null = null;

export function registerAppToast(next: ToastListener | null) {
  listener = next;
}

export function showAppToast(message: string) {
  if (listener) {
    listener(message);
    return;
  }
  console.warn("[toast]", message);
}
