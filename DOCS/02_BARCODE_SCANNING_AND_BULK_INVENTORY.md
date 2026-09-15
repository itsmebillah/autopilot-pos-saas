# Autopilot POS SaaS — Barcode, Scanning & Bulk Inventory Guide

**Document ID:** `DOCS/02_BARCODE_SCANNING_AND_BULK_INVENTORY.md`  
**Status:** Implemented & Verified  
**Scope:** Universal Retail POS (Cosmetics, Watches, Electronics, Fashion, Grocery, Hardware, Mobile, General Retail)

---

## 1. Feature Architecture Overview

This module provides end-to-end support for barcode generation, label printing, multi-device scanning, bulk spreadsheet imports, and auditable inventory adjustments across all retail categories.

```
                  ┌────────────────────────┐
                  │ Product Catalog & CRM  │
                  └───────────┬────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
┌──────▼─────────┐    ┌───────▼────────┐    ┌────────▼────────┐
│ Code-128 / EAN │    │ Hardware Wedge │    │ Bulk CSV Import │
│ Barcode Engine │    │ & Camera Scan  │    │ & Column Mapper │
└──────┬─────────┘    └───────┬────────┘    └────────┬────────┘
       │                      │                      │
┌──────▼─────────┐    ┌───────▼────────┐    ┌────────▼────────┐
│ Thermal & A4   │    │ POS Register   │    │ Auditable Stock │
│ Label Printing │    │ Cart Checkout  │    │ Movement Ledger │
└────────────────┘    └────────────────┘    └─────────────────┘
```

---

## 2. Automatic Barcode Generation & Validation

### 2.1 Unique Collision-Safe Generation (`lib/barcode-engine.ts`)
* **Algorithm:** `generateStoreBarcode(prefix = "AP")` generates deterministic, collision-safe barcodes encoding the store prefix, 2-digit year, 2-digit month, 2-digit day, and a 5-digit random sequence (e.g. `AP26091548291`).
* **Standards Supported:**
  * System-generated Code-128 (Subset B)
  * Manufacturer-provided EAN-13, EAN-8, UPC-A, UPC-E, and Code-39
* **Check Digit Calculation:** Standard Modulo 103 checksum calculation ensuring compatibility with retail laser scanners and image detectors worldwide.

### 2.2 Vector SVG Generator
* Renders scalable SVG barcode elements with exact bar/space ratios and human-readable text labels.
* Resolution-independent output formatted for:
  * 58mm / 80mm thermal POS receipt printers
  * 50×30mm / 40×25mm adhesive label rolls
  * A4 sticker sheets (3×8, 4×10 grid layouts)

---

## 3. Barcode Label Printing (`components/BarcodeLabelModal.tsx`)

### 3.1 Capabilities
* **Single Product Print:** 1-tap print icon on any product card in the catalog.
* **Bulk Multi-Product Print:** Multi-select checkboxes across products with consolidated print preview.
* **Copy Quantity Management:** Custom copies per product or instant "Match In-Stock Quantities" sync.
* **Layout Presets:**
  * **Thermal Roll:** 50×30mm / 58mm with automatic CSS page breaks (`break-inside-avoid print:page-break-after-always`).
  * **Sheet Grid:** A4 3×8 grid for standard office and laser printers.
* **Configurable Label Headers:** Toggle store name, selling price, and SKU/barcode number.

---

## 4. POS Barcode Scanning Suite

### 4.1 USB / Bluetooth Hardware Scanner Hook (`hooks/useBarcodeScanner.ts`)
* Intercepts rapid keyboard wedge barcode scanner bursts (<60ms inter-character timing ending with `Enter`).
* Immediately matches products by barcode or ID.
* Automatically increments cart quantity with sound and visual feedback without requiring focus on a specific search input.

### 4.2 Mobile & Tablet Camera Scanner (`components/CameraBarcodeScanner.tsx`)
* Uses native browser `BarcodeDetector` API with fast fallback.
* Rear/environment camera optimization with front-camera toggle.
* Torch / flashlight toggle for low-light retail counters.
* Laser viewfinder animation and audible scan beep feedback via Web Audio API.
* Continuous scanning mode allows cashiers to scan multiple items without closing the camera modal.

---

## 5. Bulk Product Import (`components/BulkImportModal.tsx`)

### 5.1 4-Step Import Wizard
1. **Upload:** Drag-and-drop CSV / Excel spreadsheet. Automatically detects delimiters (comma, semicolon, tab).
2. **Column Mapping:** Interactively maps spreadsheet columns to `Product Name`, `Barcode`, `SKU`, `Category`, `Buy Price`, `Sell Price`, `Stock`, `Min Stock`.
3. **Pre-Import Validation:**
   * Automatically generates unique barcodes for rows where barcode is blank.
   * Rejects duplicate barcodes within the CSV and against existing catalog.
   * Visual error badges and warning counts.
4. **Batch Import:** Creates database records and initial inventory ledger entries.

---

## 6. Auditable Inventory Operations (`components/StockAdjustmentModal.tsx`)

### 6.1 Reason Codes & Ledger Audit Trail
Every stock adjustment requires an explicit reason code and creates an auditable record in `stock_movements`:
* `PURCHASE_RECEIVE` — New supplier shipment / restock
* `DAMAGE_LOSS` — Broken, damaged, or expired stock write-off
* `AUDIT_ADJUSTMENT` — Physical count discrepancy correction
* `RETURN_IN` — Customer or supplier return
* `CORRECTION` — Manual data entry correction

---

## 7. Automated Test Suite

```bash
# 1. Barcode Engine Unit Tests (Code-128 checksums, collision safety, SVG generation)
# 2. Bulk CSV Import Tests (quoted fields, auto-barcode generation, duplicate detection)
# 3. Inventory Ledger Tests (stock adjustments, audit reasons, negative stock prevention)
npm run test
```
