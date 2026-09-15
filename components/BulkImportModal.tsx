"use client";

import { useState, useRef } from "react";
import { X, Upload, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, RefreshCw, FileText } from "lucide-react";
import { parseCSV, mapAndValidateImportRows, ColumnMapping, ProductImportRow } from "@/lib/csv-parser";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingBarcodes?: Set<string>;
}

export default function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
  existingBarcodes = new Set(),
}: BulkImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<"upload" | "map" | "preview" | "importing">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ name: "" });
  const [validatedRows, setValidatedRows] = useState<ProductImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<{ imported: number; failed: number } | null>(null);

  if (!isOpen) return null;

  function resetState() {
    setStep("upload");
    setCsvHeaders([]);
    setRawRows([]);
    setMapping({ name: "" });
    setValidatedRows([]);
    setImporting(false);
    setImportStats(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const { headers, rows } = parseCSV(text);
      if (headers.length === 0 || rows.length === 0) {
        alert("The uploaded file is empty or formatted improperly.");
        return;
      }

      setCsvHeaders(headers);
      setRawRows(rows);

      // Auto-detect matching header names
      const autoMap: ColumnMapping = { name: "" };
      headers.forEach((h) => {
        const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (norm.includes("name") || norm.includes("product") || norm.includes("title")) autoMap.name = h;
        if (norm.includes("barcode") || norm.includes("upc") || norm.includes("ean")) autoMap.barcode = h;
        if (norm.includes("sku") || norm.includes("code")) autoMap.sku = h;
        if (norm.includes("category") || norm.includes("type")) autoMap.category = h;
        if (norm.includes("buy") || norm.includes("cost") || norm.includes("purchase")) autoMap.buy_price = h;
        if (norm.includes("sell") || norm.includes("price") || norm.includes("retail")) autoMap.sell_price = h;
        if (norm.includes("stock") || norm.includes("qty") || norm.includes("quantity")) autoMap.stock = h;
        if (norm.includes("min") || norm.includes("reorder") || norm.includes("alert")) autoMap.min_stock = h;
      });

      setMapping(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
  }

  function handleProcessMapping() {
    if (!mapping.name) {
      alert("Please map the 'Product Name' column.");
      return;
    }

    const validated = mapAndValidateImportRows(rawRows, mapping, existingBarcodes);
    setValidatedRows(validated);
    setStep("preview");
  }

  async function handleExecuteImport() {
    const validRows = validatedRows.filter((r) => !r.errors || r.errors.length === 0);
    if (validRows.length === 0) {
      alert("There are no valid rows to import.");
      return;
    }

    setImporting(true);
    setStep("importing");

    try {
      const res = await fetch("/api/products/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: validRows }),
      });

      const data = await res.json();
      if (data.success) {
        setImportStats({
          imported: data.importedCount || validRows.length,
          failed: (data.failedCount || 0) + (validatedRows.length - validRows.length),
        });
        onSuccess();
      } else {
        alert(data.message || "Bulk import failed");
        setStep("preview");
      }
    } catch (err) {
      console.error("Import error:", err);
      alert("Error occurred during bulk import");
      setStep("preview");
    } finally {
      setImporting(false);
    }
  }

  const validCount = validatedRows.filter((r) => !r.errors || r.errors.length === 0).length;
  const invalidCount = validatedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400">
              <Upload size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Bulk Product Import</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">Import products from CSV with automatic barcode generation</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            className="p-2 text-slate-400 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Wizard Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-lg border-2 border-dashed border-slate-300 dark:border-gray-700 hover:border-green-500/60 rounded-3xl p-8 sm:p-12 cursor-pointer transition-all bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 flex flex-col items-center justify-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText size={32} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Click or drag & drop CSV file</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Supports UTF-8 CSV, Comma/Semicolon/Tab separated files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="text-xs text-slate-500 dark:text-gray-400 max-w-md">
                💡 <span className="text-slate-700 dark:text-gray-300 font-semibold">Tip:</span> If the Barcode column is empty, Autopilot POS will
                automatically generate unique collision-safe barcodes.
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === "map" && (
            <div className="space-y-5">
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-gray-300 flex items-center justify-between">
                <span>
                  Found <strong className="text-slate-900 dark:text-white">{rawRows.length} rows</strong> in CSV file.
                </span>
                <span className="text-green-600 dark:text-green-400 font-semibold">Match CSV headers to database fields</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 block mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mapping.name}
                    onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">-- Select Column --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 block mb-1">
                    Barcode (Leave blank to auto-generate)
                  </label>
                  <select
                    value={mapping.barcode || ""}
                    onChange={(e) => setMapping({ ...mapping, barcode: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">-- Auto-generate Barcodes --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 block mb-1">SKU / Item Code</label>
                  <select
                    value={mapping.sku || ""}
                    onChange={(e) => setMapping({ ...mapping, sku: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">-- Optional --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 block mb-1">Category</label>
                  <select
                    value={mapping.category || ""}
                    onChange={(e) => setMapping({ ...mapping, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">-- Optional (Default: General) --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 block mb-1">Cost / Buy Price</label>
                  <select
                    value={mapping.buy_price || ""}
                    onChange={(e) => setMapping({ ...mapping, buy_price: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">-- Optional (Default: 0) --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 block mb-1">Selling Price</label>
                  <select
                    value={mapping.sell_price || ""}
                    onChange={(e) => setMapping({ ...mapping, sell_price: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">-- Optional (Default: 0) --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 block mb-1">Initial Stock Quantity</label>
                  <select
                    value={mapping.stock || ""}
                    onChange={(e) => setMapping({ ...mapping, stock: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">-- Optional (Default: 0) --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 block mb-1">Min / Alert Stock</label>
                  <select
                    value={mapping.min_stock || ""}
                    onChange={(e) => setMapping({ ...mapping, min_stock: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">-- Optional (Default: 5) --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & VALIDATION */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold">
                    <CheckCircle2 size={16} /> {validCount} Valid Row(s)
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                      <AlertTriangle size={16} /> {invalidCount} Invalid Row(s)
                    </span>
                  )}
                </div>
                <span className="text-slate-500 dark:text-gray-400">Total {validatedRows.length} items ready for processing</span>
              </div>

              <div className="max-h-72 overflow-x-auto overflow-y-auto border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/40">
                <table className="w-full text-left text-xs text-slate-600 dark:text-gray-300">
                  <thead className="bg-slate-200/70 dark:bg-white/10 text-slate-900 dark:text-white text-[11px] sticky top-0">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5">Barcode</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Buy Price</th>
                      <th className="p-2.5">Sell Price</th>
                      <th className="p-2.5">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {validatedRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className={r.errors ? "bg-red-500/10" : "hover:bg-slate-100 dark:hover:bg-white/5"}>
                        <td className="p-2.5">
                          {r.errors ? (
                            <span className="text-red-600 dark:text-red-400 font-bold" title={r.errors.join(", ")}>
                              ⚠️ Error
                            </span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400 font-bold">✓ Ready</span>
                          )}
                        </td>
                        <td className="p-2.5 font-medium text-slate-900 dark:text-white">{r.name}</td>
                        <td className="p-2.5 font-mono text-[11px]">
                          {r.barcode} {r.is_generated_barcode && <span className="text-green-600 dark:text-green-400 text-[9px] font-sans">(Auto)</span>}
                        </td>
                        <td className="p-2.5 text-slate-500 dark:text-gray-400">{r.category}</td>
                        <td className="p-2.5">{r.buy_price}</td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{r.sell_price}</td>
                        <td className="p-2.5 font-semibold text-green-600 dark:text-green-400">{r.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validatedRows.length > 50 && (
                <p className="text-[11px] text-slate-400 dark:text-gray-500 text-center">
                  Showing first 50 rows of {validatedRows.length} total rows.
                </p>
              )}
            </div>
          )}

          {/* STEP 4: IMPORTING / RESULTS */}
          {step === "importing" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              {importing ? (
                <>
                  <RefreshCw size={36} className="animate-spin text-green-600 dark:text-green-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Importing Products to Catalog...</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Creating store products and recording inventory ledger entries</p>
                </>
              ) : importStats ? (
                <>
                  <CheckCircle2 size={44} className="text-green-600 dark:text-green-400" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Import Completed Successfully!</h3>
                  <div className="flex gap-4 text-sm font-semibold">
                    <span className="text-green-600 dark:text-green-400">{importStats.imported} Products Created</span>
                    {importStats.failed > 0 && <span className="text-red-600 dark:text-red-400">{importStats.failed} Failed</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetState();
                      onClose();
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Done
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {step !== "importing" && (
          <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-gray-950">
            {step === "map" && (
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {step === "preview" && (
              <button
                type="button"
                onClick={() => setStep("map")}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  resetState();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-400 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              {step === "map" && (
                <button
                  type="button"
                  onClick={handleProcessMapping}
                  className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                >
                  Validate & Preview <ArrowRight size={14} />
                </button>
              )}

              {step === "preview" && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={validCount === 0}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                    validCount > 0
                      ? "bg-green-500 hover:bg-green-600 text-slate-950 active:scale-95 cursor-pointer"
                      : "bg-slate-200 dark:bg-gray-800 text-slate-400 dark:text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <CheckCircle2 size={16} /> Import {validCount} Product(s)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
