export const templates = ["forma", "type", "exhibit", "wave", "cut"] as const;
export type Template = (typeof templates)[number];
export type Lang = "ru" | "en";
export const palettes = [
  {
    name: ["Ультрамарин", "Ultramarine"],
    paper: "#f4efdf",
    inks: ["#1749e8", "#ef492e", "#20221e"],
  },
  {
    name: ["Лесной тираж", "Forest edition"],
    paper: "#f1efd9",
    inks: ["#187052", "#e38a35", "#22352c"],
  },
  {
    name: ["Розовый шум", "Pink noise"],
    paper: "#fae5e5",
    inks: ["#d32663", "#364ab0", "#282022"],
  },
  {
    name: ["Графит", "Graphite"],
    paper: "#eae7df",
    inks: ["#30342e", "#797e6e", "#171b18"],
  },
] as const;
export interface Doc {
  version: 1;
  template: Template;
  title: string;
  subtitle: string;
  note: string;
  palette: number;
  format: "portrait" | "square" | "landscape";
  seed: number;
  scale: number;
  x: number;
  y: number;
  rotation: number;
  registration: number;
  grain: number;
  halftone: number;
  opacity: number;
  layers: boolean[];
  blend: boolean;
}
export const defaults: Doc = {
  version: 1,
  template: "forma",
  title: "FORM\n& FEEL",
  subtitle: "AN EXPLORATION OF SHAPE, COLOUR & HUMAN CONNECTION",
  note: "INDEPENDENT PRINT SERIES / 001",
  palette: 0,
  format: "portrait",
  seed: 42,
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
  registration: 3,
  grain: 12,
  halftone: 30,
  opacity: 94,
  layers: [true, true, true],
  blend: true,
};
export const clone = (d: Doc): Doc => ({ ...d, layers: [...d.layers] });
export function validate(value: unknown): Doc {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid");
  const d = value as Record<string, unknown>;
  if (
    d.version !== 1 ||
    !templates.includes(d.template as Template) ||
    !["portrait", "square", "landscape"].includes(d.format as string)
  )
    throw new Error("invalid");
  for (const [k, max] of [
    ["title", 160],
    ["subtitle", 240],
    ["note", 100],
  ] as const)
    if (
      typeof d[k] !== "string" ||
      (d[k] as string).length > max ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(d[k] as string)
    )
      throw new Error("invalid");
  for (const [k, min, max] of [
    ["palette", 0, 3],
    ["seed", 1, 99999],
    ["scale", 0.75, 1.15],
    ["x", -40, 40],
    ["y", -40, 40],
    ["rotation", -12, 12],
    ["registration", 0, 12],
    ["grain", 0, 40],
    ["halftone", 0, 80],
    ["opacity", 40, 100],
  ] as const)
    if (
      typeof d[k] !== "number" ||
      !Number.isFinite(d[k]) ||
      (d[k] as number) < min ||
      (d[k] as number) > max
    )
      throw new Error("invalid");
  if (
    !Number.isInteger(d.palette) ||
    !Number.isInteger(d.seed) ||
    typeof d.blend !== "boolean" ||
    !Array.isArray(d.layers) ||
    d.layers.length !== 3 ||
    !d.layers.every((v) => typeof v === "boolean")
  )
    throw new Error("invalid");
  return Object.fromEntries(
    Object.keys(defaults).map((k) => [k, d[k]]),
  ) as unknown as Doc;
}
export function parseProject(text: string): Doc {
  if (new TextEncoder().encode(text).length > 32768) throw new Error("size");
  return validate(JSON.parse(text));
}
export function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export class History {
  past: Doc[] = [];
  future: Doc[] = [];
  push(d: Doc) {
    this.past.push(clone(d));
    if (this.past.length > 80) this.past.shift();
    this.future = [];
  }
  undo(d: Doc) {
    const next = this.past.pop();
    if (next) this.future.push(clone(d));
    return next;
  }
  redo(d: Doc) {
    const next = this.future.pop();
    if (next) this.past.push(clone(d));
    return next;
  }
}
export const size = (d: Doc) =>
  d.format === "square"
    ? [800, 800]
    : d.format === "landscape"
      ? [1000, 700]
      : [700, 990];
