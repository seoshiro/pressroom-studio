import type { Path } from "opentype.js";
// Serialize original outline commands directly. OpenType.js 2's SVG decimal
// rounding can turn very small finite glyph coordinates into NaN.
export function outline(path: Path): string {
  const n = (v: number) => {
    if (!Number.isFinite(v)) throw new Error("outline");
    return v.toFixed(2);
  };
  return path.commands
    .map((c) => {
      if (c.type === "Z") return "Z";
      if (c.type === "M" || c.type === "L")
        return `${c.type}${n(c.x)} ${n(c.y)}`;
      if (c.type === "Q") return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    })
    .join("");
}
