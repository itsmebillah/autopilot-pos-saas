/**
 * Autopilot POS SaaS — CSV & Spreadsheet Parser with Interactive Mapping
 */

import { generateStoreBarcode, isValidBarcode } from "./barcode-engine";

export interface ParsedCSVRow {
  [header: string]: string;
}

export interface ProductImportRow {
  name: string;
  barcode: string;
  sku?: string;
  category?: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  is_generated_barcode?: boolean;
  errors?: string[];
}

/**
 * Parses raw CSV string into rows with detected headers.
 * Handles quoted fields, commas, semicolons, and tabs.
 */
export function parseCSV(rawContent: string): { headers: string[]; rows: ParsedCSVRow[] } {
  const lines = rawContent
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Detect delimiter (comma, semicolon, tab)
  const firstLine = lines[0];
  let delimiter = ",";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) {
    delimiter = ";";
  } else if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = "\t";
  }

  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h, i) => h || `Column_${i + 1}`);
  const rows: ParsedCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const rowObj: ParsedCSVRow = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] ?? "";
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

export interface ColumnMapping {
  name: string;
  barcode?: string;
  sku?: string;
  category?: string;
  buy_price?: string;
  sell_price?: string;
  stock?: string;
  min_stock?: string;
}

/**
 * Transform parsed CSV rows into validated ProductImportRows with auto-barcode generation
 */
export function mapAndValidateImportRows(
  rows: ParsedCSVRow[],
  mapping: ColumnMapping,
  existingBarcodes: Set<string> = new Set(),
  storePrefix = "AP"
): ProductImportRow[] {
  const seenBarcodesInBatch = new Set<string>();
  const validated: ProductImportRow[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const raw = rows[idx];
    const errors: string[] = [];

    const name = (mapping.name ? raw[mapping.name] : "").trim();
    if (!name) {
      errors.push("Product name is required");
    }

    let barcode = (mapping.barcode ? raw[mapping.barcode] : "").trim();
    let isGenerated = false;

    if (!barcode) {
      // Automatically generate a unique barcode
      let candidate = generateStoreBarcode(storePrefix);
      while (existingBarcodes.has(candidate) || seenBarcodesInBatch.has(candidate)) {
        candidate = generateStoreBarcode(storePrefix);
      }
      barcode = candidate;
      isGenerated = true;
    } else {
      if (!isValidBarcode(barcode)) {
        errors.push(`Invalid barcode format: "${barcode}"`);
      } else if (existingBarcodes.has(barcode)) {
        errors.push(`Barcode "${barcode}" already exists in catalog`);
      } else if (seenBarcodesInBatch.has(barcode)) {
        errors.push(`Duplicate barcode "${barcode}" found in import file`);
      }
    }

    seenBarcodesInBatch.add(barcode);

    const sku = mapping.sku ? raw[mapping.sku]?.trim() : undefined;
    const category = mapping.category ? raw[mapping.category]?.trim() : "General";

    const buyPriceRaw = mapping.buy_price ? raw[mapping.buy_price]?.trim() : "0";
    const buy_price = parseFloat(buyPriceRaw) || 0;
    if (isNaN(buy_price) || buy_price < 0) {
      errors.push("Invalid buy price");
    }

    const sellPriceRaw = mapping.sell_price ? raw[mapping.sell_price]?.trim() : "0";
    const sell_price = parseFloat(sellPriceRaw) || 0;
    if (isNaN(sell_price) || sell_price < 0) {
      errors.push("Invalid sell price");
    }

    const stockRaw = mapping.stock ? raw[mapping.stock]?.trim() : "0";
    const stock = parseFloat(stockRaw) || 0;
    if (isNaN(stock) || stock < 0) {
      errors.push("Invalid stock quantity");
    }

    const minStockRaw = mapping.min_stock ? raw[mapping.min_stock]?.trim() : "5";
    const min_stock = parseFloat(minStockRaw) || 5;

    validated.push({
      name,
      barcode,
      sku,
      category: category || "General",
      buy_price,
      sell_price,
      stock,
      min_stock,
      is_generated_barcode: isGenerated,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  return validated;
}
