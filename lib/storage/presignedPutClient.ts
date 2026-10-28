export type PresignedPutResult = {
  ok: boolean;
  status: number;
  statusText: string;
  bodyText: string;
};

/**
 * XMLHttpRequest is more reliable for presigned R2 uploads on iOS WebView.
 */
export function putBlobToPresignedUrl(params: {
  url: string;
  body: Blob;
  contentType: string;
  timeoutMs?: number;
}): Promise<PresignedPutResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", params.url, true);
    xhr.setRequestHeader("Content-Type", params.contentType);
    xhr.timeout = params.timeoutMs ?? 15 * 60 * 1000;

    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        bodyText: xhr.responseText || "",
      });
    };

    xhr.onerror = () => reject(new Error("Load failed"));
    xhr.onabort = () => reject(new Error("Upload geannuleerd"));
    xhr.ontimeout = () => reject(new Error("Upload timeout"));

    xhr.send(params.body);
  });
}
