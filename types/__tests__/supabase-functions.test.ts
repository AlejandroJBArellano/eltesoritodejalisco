import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Analiza el bloque Functions: { ... } de types/supabase.ts
 * y detecta si alguna función RPC tiene sobrecargas (tipos de unión con '|')
 * que provocan el error de PostgREST PGRST203 ("Could not choose the best candidate function").
 */
export function findOverloadedFunctions(supabaseTypesContent: string): string[] {
  const functionsBlockMatch = supabaseTypesContent.match(
    /Functions:\s*\{([\s\S]*?)\n\s{4}\}\s*(?:Enums:|CompositeTypes:|\})/
  );

  if (!functionsBlockMatch) {
    return [];
  }

  const blockContent = functionsBlockMatch[1];
  const lines = blockContent.split("\n");
  const overloadedFunctions: string[] = [];

  let currentFunction: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detectar nombre de la función (indentación de 6 espacios: '      func_name:')
    const funcMatch = line.match(/^\s{6}([a-zA-Z0-9_]+):\s*$/);
    if (funcMatch) {
      currentFunction = funcMatch[1];
      // Verificar si la siguiente línea no vacía empieza con '|'
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;
        if (nextLine.startsWith("|")) {
          overloadedFunctions.push(currentFunction);
        }
        break;
      }
      continue;
    }

    // O si la misma línea tiene '|' después del nombre (e.g. '      func_name: | {')
    const inlineUnionMatch = line.match(/^\s{6}([a-zA-Z0-9_]+):\s*\|/);
    if (inlineUnionMatch) {
      overloadedFunctions.push(inlineUnionMatch[1]);
    }
  }

  return Array.from(new Set(overloadedFunctions));
}

describe("Supabase RPC Overloads Guard (Prevención de PGRST203)", () => {
  it("detects overloaded functions from simulated type definitions", () => {
    const mockOverloadedTypes = `
    Functions: {
      create_order_with_items:
        | {
            Args: { p_tenant_id: string }
            Returns: Json
          }
        | {
            Args: { p_tenant_id: string; p_discount: number }
            Returns: Json
          }
      normal_function: {
        Args: { id: string }
        Returns: string
      }
    }
    Enums: {}
    `;

    const detected = findOverloadedFunctions(mockOverloadedTypes);
    expect(detected).toEqual(["create_order_with_items"]);
  });

  it("returns empty array when all functions are unambiguous", () => {
    const mockCleanTypes = `
    Functions: {
      create_order_with_items: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      normal_function: {
        Args: { id: string }
        Returns: string
      }
    }
    Enums: {}
    `;

    const detected = findOverloadedFunctions(mockCleanTypes);
    expect(detected).toEqual([]);
  });

  it("verifies that types/supabase.ts has NO overloaded functions in production", () => {
    const typesFilePath = path.join(process.cwd(), "types/supabase.ts");
    expect(fs.existsSync(typesFilePath)).toBe(true);

    const content = fs.readFileSync(typesFilePath, "utf8");
    const overloaded = findOverloadedFunctions(content);

    if (overloaded.length > 0) {
      const errorMsg =
        `🚨 ERROR CRÍTICO DE POSTGREST (PGRST203 DETECTADO):\n` +
        `Las siguientes funciones tienen sobrecargas en PostgreSQL: [${overloaded.join(", ")}].\n` +
        `En PostgreSQL, CREATE OR REPLACE FUNCTION no reemplaza si cambian los parámetros.\n` +
        `Para solucionarlo, debes ejecutar en tu migración:\n` +
        overloaded
          .map(
            (fn) => `DROP FUNCTION IF EXISTS public.${fn}(<argumentos_anteriores>);`
          )
          .join("\n") +
        `\nY luego regenerar tipos con: npm run db:types`;

      expect(overloaded, errorMsg).toEqual([]);
    }

    expect(overloaded).toEqual([]);
  });
});
