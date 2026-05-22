export async function captureVideoThumbnail(
  file: File,
  seekSeconds = 0.05,
  timeoutMs = 4000,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      callback();
    };

    const timeoutId = window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      finish(() => reject(new Error("Thumbnail timeout")));
    }, timeoutMs);

    video.onloadeddata = () => {
      video.currentTime = Math.min(
        seekSeconds,
        Number.isFinite(video.duration) ? video.duration : seekSeconds,
      );
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;

      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        finish(() => reject(new Error("Kon geen thumbnail maken")));
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);

          if (!blob) {
            finish(() => reject(new Error("Kon geen thumbnail maken")));
            return;
          }

          finish(() => resolve(blob));
        },
        "image/jpeg",
        0.82,
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      finish(() => reject(new Error("Kon video niet lezen voor thumbnail")));
    };
  });
}
