// Exporta el SVG de un gráfico como PNG, resolviendo las variables CSS
// (los atributos var(--…) no existen fuera del DOM).

function resolveCssVars(original: SVGElement, clone: SVGElement) {
  const originals = [original, ...Array.from(original.querySelectorAll("*"))];
  const clones = [clone, ...Array.from(clone.querySelectorAll("*"))];
  originals.forEach((el, i) => {
    const target = clones[i] as SVGElement;
    if (!(el instanceof SVGElement) || !target) return;
    const computed = window.getComputedStyle(el);
    for (const prop of ["fill", "stroke", "color"] as const) {
      const value = el.getAttribute(prop) ?? "";
      if (value.includes("var(")) {
        target.setAttribute(prop, computed.getPropertyValue(prop));
      }
    }
  });
}

export async function exportChartAsPng(container: HTMLElement, fileName: string) {
  const svg = container.querySelector("svg");
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  resolveCssVars(svg, clone);

  const { width, height } = svg.getBoundingClientRect();
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const surface = window.getComputedStyle(document.body).backgroundColor;
  const data = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg load"));
      img.src = url;
    });

    const scale = 2; // nitidez en pantallas retina
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    const link = document.createElement("a");
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
