import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * kittn-pickup lleva una copia de las reglas puras de personalización.
 * Si el repo hermano existe, ambas copias deben ser idénticas.
 */
const SHARED = ["types", "tiers", "selection", "pricing", "format"];
const pickupDir = path.resolve(__dirname, "../../../../kittn-pickup/src/customization");

describe.skipIf(!fs.existsSync(pickupDir))("customization parity with kittn-pickup", () => {
  for (const name of SHARED) {
    it(`${name}.ts is identical`, () => {
      const here = fs.readFileSync(path.resolve(__dirname, `../${name}.ts`), "utf8");
      const there = fs.readFileSync(path.join(pickupDir, `${name}.ts`), "utf8");
      expect(there).toBe(here);
    });
  }
});
