import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import opentype from "opentype.js";
const { parse } = opentype;
import { outline } from "../src/path";
import {
  defaults,
  clone,
  validate,
  parseProject,
  History,
  random,
} from "../src/model";
test("untrusted imports reject invalid schema, hostile controls and unbounded work", () => {
  for (const value of [
    null,
    [],
    { ...defaults, version: 2 },
    { ...defaults, layers: [true] },
    { ...defaults, scale: 100 },
    { ...defaults, palette: 1.2 },
    { ...defaults, seed: NaN },
    { ...defaults, title: "x".repeat(161) },
    { ...defaults, note: "\u0000" },
    { ...defaults, blend: "yes" },
  ])
    assert.throws(() => validate(value));
  assert.throws(() => parseProject(" ".repeat(32769)));
  assert.throws(() => parseProject("{"));
});
test("JSON roundtrip preserves Cyrillic, symbols, and all print settings, strips extraneous keys", () => {
  const d = {
    ...defaults,
    title: "ФОРМА\nЙ Ё & É Ω",
    registration: 11,
    grain: 40,
    halftone: 70,
    layers: [false, true, true],
    format: "landscape" as const,
  };
  assert.deepEqual(parseProject(JSON.stringify(d)), d);
  assert.equal("evil" in validate({ ...d, evil: "<script>" }), false);
});
test("history undoes, redoes, branches and isolates mutable layers", () => {
  const h = new History();
  const first = clone(defaults),
    second = { ...clone(defaults), seed: 43 };
  h.push(first);
  first.layers[0] = false;
  const restored = h.undo(second)!;
  assert.equal(restored.seed, 42);
  assert.equal(restored.layers[0], true);
  assert.equal(h.redo(restored)!.seed, 43);
  h.push(second);
  assert.equal(h.future.length, 0);
  for (let i = 0; i < 90; i++) h.push(first);
  assert.equal(h.past.length, 80);
});
test("procedural print randomness is deterministic", () => {
  const a = random(42),
    b = random(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});
test("bundled display and UI fonts contain actual Russian / English / extended glyphs", () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюяÉÅΩ№&";
  for (const name of ["Display", "Regular"]) {
    const bytes = fs.readFileSync(`public/fonts/${name}.ttf`);
    const font = parse(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    for (const char of chars)
      assert.notEqual(
        font.charToGlyph(char).index,
        0,
        `${name} missing ${char}`,
      );
  }
});
test("outline serializer preserves all font commands without invalid optimizer coordinates", () => {
  const bytes = fs.readFileSync("public/fonts/Regular.ttf");
  const font = parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  const path = font.getPath(
    "AN EXPLORATION OF SHAPE, COLOUR & HUMAN CONNECTION — Й Ё Ω",
    52,
    877,
    20,
  );
  const svg = outline(path);
  assert.equal(/NaN|undefined|Infinity/.test(svg), false);
  assert.equal((svg.match(/[MLQCZ]/g) || []).length, path.commands.length);
});
