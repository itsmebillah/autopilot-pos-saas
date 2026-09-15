import { describe, it, expect } from "vitest";
import { parseCSV, mapAndValidateImportRows, ColumnMapping } from "../lib/csv-parser";

describe("Bulk Product Import & CSV Parser Engine", () => {
  it("parses comma-separated CSV with quoted text and commas inside quotes", () => {
    const csv = `Product Name,Barcode,Category,Buy Price,Sell Price,Stock
"Premium Watch, Gold Edition",WTC-001,Watches,150.00,299.00,10
"Wireless Earbuds",EAR-002,Electronics,25.50,59.99,50`;

    const { headers, rows } = parseCSV(csv);
    expect(headers).toEqual(["Product Name", "Barcode", "Category", "Buy Price", "Sell Price", "Stock"]);
    expect(rows.length).toBe(2);
    expect(rows[0]["Product Name"]).toBe("Premium Watch, Gold Edition");
    expect(rows[0]["Barcode"]).toBe("WTC-001");
    expect(rows[0]["Stock"]).toBe("10");
  });

  it("parses semicolon-delimited CSV automatically", () => {
    const csv = `Name;Barcode;Sell Price\nItem 1;BC-01;100\nItem 2;BC-02;200`;
    const { headers, rows } = parseCSV(csv);
    expect(headers).toEqual(["Name", "Barcode", "Sell Price"]);
    expect(rows.length).toBe(2);
    expect(rows[1]["Sell Price"]).toBe("200");
  });

  it("automatically generates unique barcodes when barcode column is blank", () => {
    const rawRows = [
      { Title: "Lipstick Matte Red", Cost: "5", Retail: "15", Qty: "20" },
      { Title: "Organic Honey 500g", Cost: "8", Retail: "18", Qty: "30" },
    ];

    const mapping: ColumnMapping = {
      name: "Title",
      buy_price: "Cost",
      sell_price: "Retail",
      stock: "Qty",
    };

    const validated = mapAndValidateImportRows(rawRows, mapping);
    expect(validated.length).toBe(2);
    expect(validated[0].is_generated_barcode).toBe(true);
    expect(validated[0].barcode).toMatch(/^AP\d{11}$/);
    expect(validated[1].is_generated_barcode).toBe(true);
    expect(validated[0].barcode).not.toBe(validated[1].barcode);
    expect(validated[0].errors).toBeUndefined();
  });

  it("rejects duplicates against existing catalog and duplicate barcodes within CSV batch", () => {
    const existingBarcodes = new Set(["EXISTING_BC_99"]);

    const rawRows = [
      { Title: "Product A", Barcode: "EXISTING_BC_99", Retail: "100" },
      { Title: "Product B", Barcode: "BATCH_DUP_10", Retail: "120" },
      { Title: "Product C", Barcode: "BATCH_DUP_10", Retail: "130" },
    ];

    const mapping: ColumnMapping = {
      name: "Title",
      barcode: "Barcode",
      sell_price: "Retail",
    };

    const validated = mapAndValidateImportRows(rawRows, mapping, existingBarcodes);
    expect(validated[0].errors).toContain('Barcode "EXISTING_BC_99" already exists in catalog');
    expect(validated[1].errors).toBeUndefined();
    expect(validated[2].errors).toContain('Duplicate barcode "BATCH_DUP_10" found in import file');
  });

  it("flags missing required fields such as product name", () => {
    const rawRows = [{ Title: "", Retail: "100" }];
    const mapping: ColumnMapping = { name: "Title", sell_price: "Retail" };
    const validated = mapAndValidateImportRows(rawRows, mapping);

    expect(validated[0].errors).toContain("Product name is required");
  });

  it("maps separate purchase_cost and additional_cost columns and computes landed buy_price", () => {
    const rawRows = [
      { Title: "Product X", SupplierCost: "1000", ExtraCost: "35", Retail: "1500" },
    ];
    const mapping: ColumnMapping = {
      name: "Title",
      purchase_cost: "SupplierCost",
      additional_cost: "ExtraCost",
      sell_price: "Retail",
    };
    const validated = mapAndValidateImportRows(rawRows, mapping);

    expect(validated[0].purchase_cost).toBe(1000);
    expect(validated[0].additional_cost).toBe(35);
    expect(validated[0].buy_price).toBe(1035);
    expect(validated[0].sell_price).toBe(1500);
  });
});
