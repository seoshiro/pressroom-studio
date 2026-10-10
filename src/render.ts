import { parse, type Font } from "opentype.js";
import { palettes, random, size, type Doc } from "./model";
import { outline } from "./path";
let display: Font, regular: Font;
export async function loadFonts() {
  const files = await Promise.all(
    ["Display", "Regular"].map(async (name) => {
      const r = await fetch(`${import.meta.env.BASE_URL}fonts/${name}.ttf`);
      if (!r.ok) throw new Error("font");
      return parse(await r.arrayBuffer());
    }),
  );
  [display, regular] = files;
}
export function missingGlyphs(d: Doc) {
  return [
    ...new Set(
      [...(d.title + d.subtitle + d.note)].filter(
        (c) => !/\s/.test(c) && display.charToGlyph(c).index === 0,
      ),
    ),
  ].join(" ");
}
function text(
  str: string,
  x: number,
  y: number,
  fontSize: number,
  width: number,
  font = display,
) {
  const content = str.replace(/[\r\n]+/g, " ");
  const measured = font.getAdvanceWidth(content, fontSize);
  const s = Math.min(1, width / Math.max(1, measured));
  return `<path d="${outline(font.getPath(content, x, y, fontSize * s))}"/>`;
}
function title(
  str: string,
  x: number,
  y: number,
  width: number,
  height: number,
  maxSize = 170,
) {
  let lines = str.trim().split(/\n/).filter(Boolean);
  if (lines.length === 1) {
    const words = lines[0].split(/\s+/);
    if (words.length > 1 && lines[0].length > 12) {
      const mid = Math.ceil(words.length / 2);
      lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
    }
  }
  if (lines.length > 6)
    lines = [...lines.slice(0, 5), lines.slice(5).join(" ")];
  if (!lines.length) return "";
  const fs = Math.min(maxSize, height / (lines.length * 1.07));
  const largest = Math.max(...lines.map((s) => display.getAdvanceWidth(s, fs)));
  const fit = Math.min(1, width / largest);
  const f = fs * fit;
  return lines
    .map((s, i) => text(s, x, y + f * 0.76 + i * f * 1.07, f, width))
    .join("");
}
export function render(d: Doc): string {
  if (!display) throw new Error("font");
  const [w, h] = size(d),
    p = palettes[d.palette],
    rnd = random(d.seed);
  const m = 0.075 * w,
    iw = w - 2 * m;
  const dots = (cx: number, cy: number, r: number) => {
    const out: string[] = [];
    const step = 13;
    for (let y = cy - r; y < cy + r; y += step)
      for (let x = cx - r; x < cx + r; x += step)
        if ((x - cx) ** 2 + (y - cy) ** 2 < r * r)
          out.push(`<circle cx="${x}" cy="${y}" r="${1 + d.halftone / 23}"/>`);
    return out.join("");
  };
  const layer = (i: number, content: string) =>
    d.layers[i]
      ? `<g data-ink="${i}" fill="${p.inks[i]}" opacity="${i === 2 ? 1 : d.opacity / 100}" transform="translate(${i === 1 ? d.registration : 0} ${i === 1 ? d.registration * 0.65 : 0})" ${d.blend ? 'style="mix-blend-mode:multiply"' : ""}>${content}</g>`
      : "";
  const geom = (content: string) =>
    `<g transform="translate(${w / 2 + d.x} ${h / 2 + d.y}) rotate(${d.rotation}) scale(${d.scale}) translate(${-w / 2} ${-h / 2})">${content}</g>`;
  const footer = () => {
    const words = d.subtitle.replace(/[\r\n]+/g, " ").split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? current + " " + word : word;
      if (current && regular.getAdvanceWidth(next, 20) > iw) {
        lines.push(current);
        current = word;
      } else current = next;
    }
    if (current) lines.push(current);
    const reduced =
      lines.length > 3
        ? [...lines.slice(0, 2), lines.slice(2).join(" ")]
        : lines;
    return (
      reduced
        .map((s, i) => text(s, m, h - 113 + i * 21, 20, iw, regular))
        .join("") + text(d.note, m, h - 38, 15, iw, regular)
    );
  };
  let art = "";
  if (d.template === "forma") {
    const cx = w * 0.52 + (rnd() - 0.5) * w * 0.14,
      cy = h * 0.58;
    art =
      layer(0, geom(`<circle cx="${cx}" cy="${cy}" r="${w * 0.33}"/>`)) +
      layer(
        1,
        geom(
          `<rect x="${w * 0.44}" y="${h * 0.4}" width="${w * 0.4}" height="${h * 0.32}" transform="rotate(${10 + rnd() * 14} ${w * 0.64} ${cy})"/>` +
            dots(w * 0.76, h * 0.66, w * 0.19),
        ),
      ) +
      layer(2, title(d.title, m, h * 0.105, iw, h * 0.26, 190) + footer());
    art += layer(
      2,
      `<path d="M${m} ${h * 0.815}h${iw}" fill="none" stroke="${p.inks[2]}" stroke-width="1"/>`,
    );
  } else if (d.template === "type") {
    const main = `<g transform="rotate(${rnd() * 6 - 3} ${w / 2} ${h * 0.45})">${title(d.title, m, h * 0.22, iw, h * 0.46, 250)}</g>`;
    art =
      layer(
        1,
        geom(
          `<rect x="${m}" y="${h * 0.1}" width="${iw}" height="${h * 0.08}"/>`,
        ),
      ) +
      layer(0, geom(main)) +
      layer(
        1,
        geom(`<g transform="translate(${6 + d.registration} 6)">${main}</g>`),
      ) +
      layer(2, footer() + text("TYPE / MATTER", m, h * 0.13, 20, iw, regular));
    art += layer(
      0,
      `<rect x="${m}" y="${h * 0.76}" width="${iw}" height="8"/>`,
    );
  } else if (d.template === "exhibit") {
    art =
      layer(
        0,
        geom(
          `<rect x="${m}" y="${h * 0.09}" width="${iw}" height="${h * 0.49}"/>`,
        ),
      ) +
      layer(
        1,
        geom(
          `<circle cx="${w * 0.5}" cy="${h * 0.335}" r="${w * 0.27}" fill="${p.paper}"/>` +
            dots(w * 0.5, h * 0.335, w * 0.245),
        ),
      ) +
      layer(2, title(d.title, m, h * 0.62, iw, h * 0.19, 130) + footer());
    art += layer(1, text("01 — 31", m * 1.3, h * 0.16, 30, iw * 0.4, regular));
  } else if (d.template === "wave") {
    const waves = Array.from(
      { length: 18 },
      (_, i) =>
        `<path d="M${-w * 0.15} ${h * 0.26 + i * 18} Q${w * 0.28} ${h * 0.03 + i * 18} ${w * 0.52} ${h * 0.38 + i * 10} T${w * 1.2} ${h * 0.2 + i * 22}" fill="none" stroke="${p.inks[i % 2]}" stroke-width="${8 + rnd() * 6}"/>`,
    );
    art =
      layer(0, geom(waves.filter((_, i) => i % 2 === 0).join(""))) +
      layer(1, geom(waves.filter((_, i) => i % 2 !== 0).join(""))) +
      layer(2, title(d.title, m, h * 0.58, iw, h * 0.22, 145) + footer());
  } else {
    const shards = Array.from(
      { length: 6 },
      (_, i) =>
        `<polygon points="${m + (i * iw) / 6},${h * 0.14 + rnd() * h * 0.12} ${m + ((i + 1) * iw) / 6},${h * 0.1} ${m + ((i + 0.5) * iw) / 6},${h * 0.63 + rnd() * h * 0.08}"/>`,
    );
    art =
      layer(0, geom(shards.filter((_, i) => i % 2 === 0).join(""))) +
      layer(1, geom(shards.filter((_, i) => i % 2 !== 0).join(""))) +
      layer(2, title(d.title, m, h * 0.69, iw, h * 0.12, 105) + footer());
  }
  const noise = Array.from(
    { length: Math.round(d.grain * 32) },
    () =>
      `<circle cx="${rnd() * w}" cy="${rnd() * h}" r="${0.35 + rnd() * 0.7}"/>`,
  ).join("");
  const marks = `<g fill="none" stroke="${p.inks[2]}" stroke-width=".8" opacity=".5"><path d="M${m - 16} 24h32m-16-8v16M${w - m - 16} 24h32m-16-8v16M${m - 16} ${h - 20}h32m-16-8v16M${w - m - 16} ${h - 20}h32m-16-8v16"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Poster" overflow="hidden" style="isolation:isolate"><g><rect width="${w}" height="${h}" fill="${p.paper}"/>${art}<g fill="#16170f" opacity=".09">${noise}</g>${d.layers[2] ? marks : ""}</g></svg>`;
}
export async function pngBlob(
  svg: string,
  format: Doc["format"],
  multiplier = 3,
): Promise<Blob> {
  const [w, h] = size({ ...({ format } as Doc) });
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w * multiplier;
    canvas.height = h * multiplier;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("export"))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
