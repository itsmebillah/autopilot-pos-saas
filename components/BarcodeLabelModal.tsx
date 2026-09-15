"use client";

import { useState } from "react";
import { X, Printer, Grid, RefreshCw } from "lucide-react";
import { generateBarcodeSVG } from "@/lib/barcode-engine";

export interface LabelProductItem {
  id: string;
  name: string;
  barcode: string;
  sku?: string;
  sell_price: number;
  stock?: number;
  copies?: number;
}

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: LabelProductItem[];
  storeName?: string;
  currencySymbol?: string;
}

export default function BarcodeLabelModal({
  isOpen,
  onClose,
  products,
  storeName = "Autopilot POS",
  currencySymbol = "৳",
}: BarcodeLabelModalProps) {
  const [copiesMap, setCopiesMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach((p) => {
      initial[p.id] = p.copies || 1;
    });
    return initial;
  });

  const [layoutMode, setLayoutMode] = useState<"thermal_single" | "sheet_grid">("thermal_single");
  const [showStoreName, setShowStoreName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showSku, setShowSku] = useState(true);

  if (!isOpen || products.length === 0) return null;

  function updateCopies(id: string, count: number) {
    setCopiesMap((prev) => ({
      ...prev,
      [id]: Math.max(1, count),
    }));
  }

  function matchStockCopies() {
    const updated: Record<string, number> = {};
    products.forEach((p) => {
      updated[p.id] = Math.max(1, Number(p.stock) || 1);
    });
    setCopiesMap(updated);
  }

  // Flatten items for label rendering according to copies count
  const labelsToPrint: { product: LabelProductItem; index: number }[] = [];
  products.forEach((p) => {
    const count = copiesMap[p.id] || 1;
    for (let i = 0; i < count; i++) {
      labelsToPrint.push({ product: p, index: i });
    }
  });

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gray-950 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:shadow-none print:border-none print:max-w-none print:max-h-none print:p-0">
        {/* Modal Header (Hidden during print) */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/20 text-green-400">
              <Printer size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Print Barcode Labels</h2>
              <p className="text-xs text-gray-400">
                {products.length} product(s) selected • Total {labelsToPrint.length} labels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Configuration Controls (Hidden during print) */}
        <div className="p-4 sm:p-6 bg-white/5 border-b border-white/10 space-y-4 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLayoutMode("thermal_single")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  layoutMode === "thermal_single"
                    ? "bg-green-500 text-black shadow-lg"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                Thermal Roll (50×30mm / 58mm)
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("sheet_grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  layoutMode === "sheet_grid"
                    ? "bg-green-500 text-black shadow-lg"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                <Grid size={14} /> A4 Sheet Grid (3×8)
              </button>
            </div>

            <button
              type="button"
              onClick={matchStockCopies}
              className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 font-medium underline"
            >
              <RefreshCw size={13} /> Match in-stock quantities
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showStoreName}
                onChange={(e) => setShowStoreName(e.target.checked)}
                className="rounded border-gray-700 text-green-500 focus:ring-green-500"
              />
              Show Store Name
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="rounded border-gray-700 text-green-500 focus:ring-green-500"
              />
              Show Selling Price
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSku}
                onChange={(e) => setShowSku(e.target.checked)}
                className="rounded border-gray-700 text-green-500 focus:ring-green-500"
              />
              Show SKU
            </label>
          </div>

          {/* Product copy modifiers */}
          <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 text-xs bg-black/40 px-3 py-2 rounded-xl border border-white/5"
              >
                <div className="truncate flex-1">
                  <span className="font-semibold text-white truncate block">{p.name}</span>
                  <span className="text-gray-400 font-mono text-[10px]">Barcode: {p.barcode}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-400">Copies:</span>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={copiesMap[p.id] || 1}
                    onChange={(e) => updateCopies(p.id, parseInt(e.target.value, 10) || 1)}
                    className="w-16 px-2 py-1 rounded-lg bg-black border border-gray-700 text-white text-center font-bold"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Printable Label Canvas Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-900/40 print:p-0 print:overflow-visible print:bg-white">
          <div
            className={`mx-auto ${
              layoutMode === "thermal_single"
                ? "flex flex-col items-center gap-4 print:block"
                : "grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2"
            }`}
          >
            {labelsToPrint.map(({ product, index }) => (
              <div
                key={`${product.id}-${index}`}
                className="bg-white text-black p-3 rounded-lg border border-gray-300 shadow-md flex flex-col items-center justify-between text-center w-60 h-36 print:w-[50mm] print:h-[30mm] print:border-none print:shadow-none print:p-1.5 print:break-inside-avoid print:page-break-after-always"
                style={{ breakInside: "avoid" }}
              >
                {showStoreName && (
                  <div className="text-[10px] font-bold tracking-wider uppercase text-gray-800 truncate w-full">
                    {storeName}
                  </div>
                )}
                <div className="text-xs font-bold leading-tight line-clamp-1 w-full text-black px-1">
                  {product.name}
                </div>

                <div
                  className="w-full flex items-center justify-center my-0.5 h-12"
                  dangerouslySetInnerHTML={{
                    __html: generateBarcodeSVG(product.barcode, {
                      height: 32,
                      barWidth: 1.5,
                      showText: true,
                      fontSize: 10,
                      barColor: "#000000",
                      textColor: "#000000",
                    }),
                  }}
                />

                <div className="flex items-center justify-between w-full text-[11px] font-semibold px-1 pt-0.5 border-t border-gray-200">
                  {showSku && (
                    <span className="font-mono text-[9px] text-gray-600 truncate">
                      {product.sku || product.barcode.slice(0, 10)}
                    </span>
                  )}
                  {showPrice && (
                    <span className="font-bold text-black ml-auto">
                      {currencySymbol}
                      {Number(product.sell_price || 0).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer (Hidden during print) */}
        <div className="p-4 sm:p-6 border-t border-white/10 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-black text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-500/20 transition-all active:scale-95"
          >
            <Printer size={18} />
            Print {labelsToPrint.length} Label(s)
          </button>
        </div>
      </div>
    </div>
  );
}
