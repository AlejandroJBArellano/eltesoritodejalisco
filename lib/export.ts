/**
 * KittnOS - Export Utilities
 * Functions to export tabular data to CSV (UTF-8 with BOM) and Excel XML (SpreadsheetML).
 */

export interface ExportColumn<T> {
  header: string;
  key?: keyof T;
  accessor?: (item: T) => string | number | boolean | null | undefined;
}

export interface ExportOptions<T> {
  filename: string;
  columns: ExportColumn<T>[];
  data: T[];
  sheetName?: string;
}

/**
 * Sanitizes cell values to prevent CSV / Excel Formula Injection (CVE-2014-3524).
 * If a string begins with =, +, -, @, \t, or \r, prepend a single quote.
 */
export function sanitizeCellValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Extracts the cell value for a given row and column definition.
 */
export function getCellValue<T>(item: T, column: ExportColumn<T>): unknown {
  if (column.accessor) {
    return column.accessor(item);
  }
  if (column.key !== undefined) {
    return item[column.key];
  }
  return "";
}

/**
 * Triggers a browser download for a Blob content.
 */
export function downloadFile(
  content: BlobPart,
  filename: string,
  mimeType: string,
): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an RFC 4180 compliant CSV string with UTF-8 BOM.
 */
export function generateCSVContent<T>(
  columns: ExportColumn<T>[],
  data: T[],
): string {
  const formatCSVField = (rawVal: unknown): string => {
    const sanitized = sanitizeCellValue(rawVal);
    // If the field contains comma, newline, carriage return, or double quotes, escape it
    if (/[",\r\n]/.test(sanitized)) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  };

  const headerLine = columns
    .map((col) => formatCSVField(col.header))
    .join(",");

  const rows = data.map((item) =>
    columns
      .map((col) => formatCSVField(getCellValue(item, col)))
      .join(","),
  );

  // UTF-8 BOM (\uFEFF) ensures Excel opens special characters correctly
  return `\uFEFF${[headerLine, ...rows].join("\r\n")}`;
}

/**
 * Exports data to a CSV file.
 */
export function exportToCSV<T>({
  filename,
  columns,
  data,
}: ExportOptions<T>): void {
  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const csvContent = generateCSVContent(columns, data);
  downloadFile(csvContent, safeFilename, "text/csv;charset=utf-8;");
}

/**
 * Generates an XML Spreadsheet 2003 string that opens natively in Microsoft Excel.
 */
export function generateExcelXML<T>(
  columns: ExportColumn<T>[],
  data: T[],
  sheetName: string = "Datos",
): string {
  const escapeXML = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const safeSheetName = escapeXML(sheetName.replace(/[\\/*?:[\]]/g, "_"));

  const headerCells = columns
    .map(
      (col) =>
        `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(col.header)}</Data></Cell>`,
    )
    .join("\n");

  const dataRows = data
    .map((item) => {
      const cells = columns
        .map((col) => {
          const rawVal = getCellValue(item, col);
          if (rawVal === null || rawVal === undefined || rawVal === "") {
            return `    <Cell><Data ss:Type="String"></Data></Cell>`;
          }
          if (typeof rawVal === "number" && !isNaN(rawVal)) {
            return `    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${rawVal}</Data></Cell>`;
          }
          const sanitized = sanitizeCellValue(rawVal);
          return `    <Cell><Data ss:Type="String">${escapeXML(sanitized)}</Data></Cell>`;
        })
        .join("\n");

      return `   <Row>\n${cells}\n   </Row>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${safeSheetName}">
  <Table>
   <Row ss:StyleID="Header">
${headerCells}
   </Row>
${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

/**
 * Exports data to an Excel XML (.xls) file.
 */
export function exportToExcel<T>({
  filename,
  columns,
  data,
  sheetName = "Datos",
}: ExportOptions<T>): void {
  const safeFilename = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  const xmlContent = generateExcelXML(columns, data, sheetName);
  downloadFile(
    xmlContent,
    safeFilename,
    "application/vnd.ms-excel;charset=utf-8",
  );
}
