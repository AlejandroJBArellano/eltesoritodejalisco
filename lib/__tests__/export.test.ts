import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sanitizeCellValue,
  getCellValue,
  generateCSVContent,
  generateExcelXML,
  exportToCSV,
  exportToExcel,
  downloadFile,
  type ExportColumn,
} from "../export";

describe("lib/export", () => {
  describe("sanitizeCellValue", () => {
    it("should return empty string for null and undefined", () => {
      expect(sanitizeCellValue(null)).toBe("");
      expect(sanitizeCellValue(undefined)).toBe("");
    });

    it("should return normal strings unchanged", () => {
      expect(sanitizeCellValue("Hola Mundo")).toBe("Hola Mundo");
      expect(sanitizeCellValue(12345)).toBe("12345");
      expect(sanitizeCellValue(true)).toBe("true");
    });

    it("should prepend a single quote to prevent formula injection", () => {
      expect(sanitizeCellValue("=1+1")).toBe("'=1+1");
      expect(sanitizeCellValue("+SUM(A1:A10)")).toBe("'+SUM(A1:A10)");
      expect(sanitizeCellValue("-10")).toBe("'-10");
      expect(sanitizeCellValue("@something")).toBe("'@something");
      expect(sanitizeCellValue("\tcmd")).toBe("'\tcmd");
      expect(sanitizeCellValue("\rcmd")).toBe("'\rcmd");
    });
  });

  describe("getCellValue", () => {
    interface TestItem {
      id: string;
      name: string;
      price: number;
    }

    const item: TestItem = { id: "1", name: "Tacos al Pastor", price: 65 };

    it("should extract value using accessor function", () => {
      const col: ExportColumn<TestItem> = {
        header: "Precio Formateado",
        accessor: (i) => `$${i.price.toFixed(2)}`,
      };
      expect(getCellValue(item, col)).toBe("$65.00");
    });

    it("should extract value using key", () => {
      const col: ExportColumn<TestItem> = {
        header: "Nombre",
        key: "name",
      };
      expect(getCellValue(item, col)).toBe("Tacos al Pastor");
    });

    it("should return empty string if neither key nor accessor is provided", () => {
      const col: ExportColumn<TestItem> = {
        header: "Vacío",
      };
      expect(getCellValue(item, col)).toBe("");
    });
  });

  describe("generateCSVContent", () => {
    it("should generate CSV with UTF-8 BOM, headers and escaped fields", () => {
      interface Row {
        id: number;
        description: string;
        amount: number;
        note: string;
      }

      const columns: ExportColumn<Row>[] = [
        { header: "ID", key: "id" },
        { header: "Descripción", key: "description" },
        { header: "Monto", key: "amount" },
        { header: "Nota", key: "note" },
      ];

      const data: Row[] = [
        {
          id: 1,
          description: "Compra de limones, cebollas y cilantro",
          amount: 150.5,
          note: 'Dijo: "con factura"',
        },
        {
          id: 2,
          description: "Línea con\nsalto",
          amount: 50,
          note: "=SUM(A1:A2)",
        },
      ];

      const csv = generateCSVContent(columns, data);

      // Verify BOM
      expect(csv.startsWith("\uFEFF")).toBe(true);

      // Verify headers
      expect(csv).toContain("ID,Descripción,Monto,Nota");

      // Verify comma escaping with quotes
      expect(csv).toContain('"Compra de limones, cebollas y cilantro"');

      // Verify double quote escaping
      expect(csv).toContain('"Dijo: ""con factura"""');

      // Verify newline escaping
      expect(csv).toContain('"Línea con\nsalto"');

      // Verify formula injection sanitization inside quotes
      expect(csv).toContain("'=SUM(A1:A2)");
    });
  });

  describe("generateExcelXML", () => {
    it("should generate valid SpreadsheetML with typed cells and styles", () => {
      interface Product {
        name: string;
        price: number;
        specialChars: string;
      }

      const columns: ExportColumn<Product>[] = [
        { header: "Producto & Tipo", key: "name" },
        { header: "Precio", key: "price" },
        { header: "Detalles <XML>", key: "specialChars" },
      ];

      const data: Product[] = [
        {
          name: "Quesadilla",
          price: 45.5,
          specialChars: 'Rica & sabrosa <"con queso">',
        },
        {
          name: "=Dangerous",
          price: 0,
          specialChars: "",
        },
      ];

      const xml = generateExcelXML(columns, data, "Ventas");

      // Check XML header and Workbook structure
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Worksheet ss:Name="Ventas">');
      expect(xml).toContain('<Style ss:ID="Header">');
      expect(xml).toContain('<Style ss:ID="NumberCell">');

      // Check escaped headers
      expect(xml).toContain("Producto &amp; Tipo");
      expect(xml).toContain("Detalles &lt;XML&gt;");

      // Check Number cell type
      expect(xml).toContain(
        '<Cell ss:StyleID="NumberCell"><Data ss:Type="Number">45.5</Data></Cell>',
      );

      // Check XML escaping in values
      expect(xml).toContain(
        'Rica &amp; sabrosa &lt;&quot;con queso&quot;&gt;',
      );

      // Check formula sanitization in String cell
      expect(xml).toContain("&apos;=Dangerous");
    });
  });

  describe("downloadFile", () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;
    let originalClick: typeof HTMLAnchorElement.prototype.click;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      originalClick = HTMLAnchorElement.prototype.click;

      URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
      URL.revokeObjectURL = vi.fn();
      HTMLAnchorElement.prototype.click = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      HTMLAnchorElement.prototype.click = originalClick;
      vi.restoreAllMocks();
    });

    it("should create link, click it and cleanup object URL", () => {
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      downloadFile("test content", "archivo.csv", "text/csv");

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should exportToCSV with proper filename extension", () => {
      type SimpleRow = { col: string };
      const testCols: ExportColumn<SimpleRow>[] = [
        { header: "Columna", key: "col" },
      ];
      const testData: SimpleRow[] = [{ col: "Valor" }];

      exportToCSV({
        filename: "reporte",
        columns: testCols,
        data: testData,
      });

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

      // Case when filename already has .csv
      exportToCSV({
        filename: "reporte.csv",
        columns: testCols,
        data: testData,
      });
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it("should exportToExcel with proper filename extension", () => {
      type SimpleRow = { col: string };
      const testCols: ExportColumn<SimpleRow>[] = [
        { header: "Columna", key: "col" },
      ];
      const testData: SimpleRow[] = [{ col: "Valor" }];

      exportToExcel({
        filename: "reporte.xls",
        columns: testCols,
        data: testData,
        sheetName: "Hoja [Inválida]",
      });

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

      // Case when filename does not have .xls
      exportToExcel({
        filename: "reporte_sin_extension",
        columns: testCols,
        data: testData,
      });
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
