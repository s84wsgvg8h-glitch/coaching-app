export async function captureElementAsPngFile(
  element: HTMLElement,
  fileName: string,
): Promise<File> {
  const svg = element.querySelector("svg");

  if (!svg) {
    throw new Error("Grafiek kon niet worden vastgelegd.");
  }

  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const scale = 2;

  const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clonedSvg.setAttribute("width", String(width));
  clonedSvg.setAttribute("height", String(height));

  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", "#ffffff");
  clonedSvg.insertBefore(background, clonedSvg.firstChild);

  const svgMarkup = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Grafiek kon niet worden vastgelegd."));
          return;
        }

        context.scale(scale, scale);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            reject(new Error("Grafiek kon niet worden vastgelegd."));
            return;
          }

          resolve(pngBlob);
        }, "image/png");
      };

      image.onerror = () => {
        reject(new Error("Grafiek kon niet worden vastgelegd."));
      };

      image.src = objectUrl;
    });

    return new File([blob], fileName, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
