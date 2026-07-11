type ExportOptions = {
  title?: string;
  subtitle?: string;
};

type LegendItem = {
  label: string;
  value?: string;
  percent?: string;
  color?: string;
};

const SVG_NS = "http://www.w3.org/2000/svg";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function resolveSvgStyles(original: SVGElement, clone: SVGElement) {
  const originals = [original, ...Array.from(original.querySelectorAll("*"))];
  const clones = [clone, ...Array.from(clone.querySelectorAll("*"))];

  originals.forEach((el, index) => {
    const target = clones[index];
    if (!(el instanceof SVGElement) || !(target instanceof SVGElement)) return;

    const computed = window.getComputedStyle(el);
    for (const prop of ["fill", "stroke", "color"] as const) {
      const value = el.getAttribute(prop);
      if (!value) continue;
      if (value.includes("var(") || value === "currentColor") {
        target.setAttribute(prop, computed.getPropertyValue(prop).trim());
      }
    }
  });
}

function collectLegendItems(container: HTMLElement): LegendItem[] {
  const items = Array.from(container.querySelectorAll("ul > li"));
  return items.map((item) => {
    const label = item.querySelector(".truncate")?.textContent?.trim() ?? "";
    const textNodes = Array.from(item.querySelectorAll("span"));
    const value = textNodes.at(-2)?.textContent?.trim();
    const percent = textNodes.at(-1)?.textContent?.trim();
    const swatch = item.querySelector("span[style*='background-color']");
    const color = swatch ? window.getComputedStyle(swatch).backgroundColor : undefined;
    return { label, value, percent, color };
  });
}

function getChartSvg(container: HTMLElement) {
  const svg = container.querySelector("svg");
  if (!svg) return null;

  const clone = svg.cloneNode(true) as SVGElement;
  resolveSvgStyles(svg, clone);

  const width =
    Number.parseFloat(svg.getAttribute("width") ?? "") ||
    svg.getBoundingClientRect().width ||
    container.getBoundingClientRect().width;
  const height =
    Number.parseFloat(svg.getAttribute("height") ?? "") ||
    svg.getBoundingClientRect().height ||
    container.getBoundingClientRect().height;

  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", String(Math.ceil(width)));
  clone.setAttribute("height", String(Math.ceil(height)));

  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    clone.setAttribute("viewBox", viewBox);
  }

  return clone;
}

function buildExportSvg(
  title: string,
  subtitle: string | undefined,
  content: HTMLElement
) {
  const paddingX = 32;
  const paddingTop = 32;
  const headerHeight = subtitle ? 96 : 70;
  const bodyGap = 20;

  const bodyWidth = Math.ceil(content.getBoundingClientRect().width);
  const bodyHeight = Math.ceil(content.getBoundingClientRect().height);
  const chartSvg = getChartSvg(content);
  const svgWidth = Math.ceil(
    Number.parseFloat(chartSvg?.getAttribute("width") ?? "") ||
      chartSvg?.getBoundingClientRect().width ||
      content.querySelector("svg")?.getBoundingClientRect().width ||
      bodyWidth
  );
  const svgHeight = Math.ceil(
    Number.parseFloat(chartSvg?.getAttribute("height") ?? "") ||
      chartSvg?.getBoundingClientRect().height ||
      content.querySelector("svg")?.getBoundingClientRect().height ||
      bodyHeight
  );
  const legendItems = collectLegendItems(content);
  const hasLegend = legendItems.length > 0;
  const legendX = paddingX + svgWidth + bodyGap;
  const legendWidth = Math.max(
    220,
    bodyWidth - svgWidth - bodyGap - paddingX * 2
  );
  const legendRowHeight = 24;
  const legendHeight = legendItems.length * legendRowHeight;
  const contentHeight = hasLegend
    ? Math.max(svgHeight, legendHeight)
    : svgHeight;
  const totalWidth = paddingX * 2 + (hasLegend ? svgWidth + bodyGap + legendWidth : svgWidth);
  const totalHeight = paddingTop + headerHeight + contentHeight + 36;
  const background = window.getComputedStyle(document.body).backgroundColor;
  const titleColor = window.getComputedStyle(document.body).color;
  const subtitleColor = "rgb(113, 113, 122)";

  const chartMarkup = chartSvg
    ? `<g transform="translate(${paddingX}, ${paddingTop + headerHeight})">${new XMLSerializer().serializeToString(chartSvg)}</g>`
    : "";

  const legendMarkup = hasLegend
    ? `
      <g transform="translate(${legendX}, ${paddingTop + headerHeight})">
        ${legendItems
          .map((item, index) => {
            const y = index * legendRowHeight;
            const label = escapeXml(item.label);
            const value = escapeXml(item.value ?? "");
            const percent = escapeXml(item.percent ?? "");
            return `
              <circle cx="7" cy="${y + 8}" r="4" fill="${escapeXml(item.color ?? "#94a3b8")}" />
              <text x="18" y="${y + 12}" fill="${escapeXml(titleColor)}" font-size="12" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
                ${label}
              </text>
              <text x="${legendWidth - 34}" y="${y + 12}" text-anchor="end" fill="${escapeXml(titleColor)}" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
                ${value}
              </text>
              <text x="${legendWidth}" y="${y + 12}" text-anchor="end" fill="rgb(113, 113, 122)" font-size="11" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
                ${percent}
              </text>
            `;
          })
          .join("")}
      </g>
    `
    : "";

  return `
    <svg xmlns="${SVG_NS}" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
      <rect width="100%" height="100%" fill="${escapeXml(background)}" />
      <text x="${paddingX}" y="${paddingTop + 22}" fill="${escapeXml(titleColor)}" font-size="22" font-weight="700" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
        ${escapeXml(title)}
      </text>
      ${
        subtitle
          ? `<text x="${paddingX}" y="${paddingTop + 46}" fill="${escapeXml(subtitleColor)}" font-size="13" font-weight="500" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${escapeXml(subtitle)}</text>`
          : ""
      }
      ${chartMarkup}
      ${legendMarkup}
    </svg>
  `;
}

export async function exportChartAsPng(
  container: HTMLElement,
  fileName: string,
  options: ExportOptions = {}
) {
  const title = options.title ?? fileName;
  const subtitle = options.subtitle?.trim() || undefined;
  if (container.getBoundingClientRect().width === 0) return;

  const svg = buildExportSvg(title, subtitle, container);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg load"));
      img.src = url;
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    const width = Math.ceil(img.naturalWidth || container.getBoundingClientRect().width);
    const height = Math.ceil(
      img.naturalHeight || container.getBoundingClientRect().height + 120
    );
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    const link = document.createElement("a");
    link.download = `${fileName}.png`;
    try {
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      link.download = `${fileName}.svg`;
      link.href = url;
      link.click();
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}
