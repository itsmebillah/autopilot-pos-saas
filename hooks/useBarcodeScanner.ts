"use client";

import { useEffect, useRef } from "react";

interface BarcodeScannerOptions {
  onScan: (scannedBarcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enabled?: boolean;
}

/**
 * Custom React hook for capturing USB/Bluetooth Hardware Barcode Scanners.
 * Hardware scanners simulate rapid keyboard strokes (<50ms between key events) ending in 'Enter'.
 * Human typing in form inputs will NOT trigger barcode scanning.
 */
export function useBarcodeScanner({
  onScan,
  minChars = 3,
  maxIntervalMs = 50,
  enabled = true,
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const fastKeyCountRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const target = e.target as HTMLElement | null;
      const isInputFocused = Boolean(
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      );

      const currentTime = Date.now();
      const interval = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        const barcode = bufferRef.current.trim();
        const wasBurst = fastKeyCountRef.current >= Math.max(1, minChars - 1);
        bufferRef.current = "";
        fastKeyCountRef.current = 0;

        // If in an active input field and typing was NOT a hardware scanner burst, ignore!
        if (isInputFocused && !wasBurst) {
          return;
        }

        if (barcode.length >= minChars) {
          if (isInputFocused) {
            e.preventDefault();
            e.stopPropagation();
          }
          onScanRef.current(barcode);
        }
        return;
      }

      // Printable character
      if (e.key.length === 1) {
        if (interval <= maxIntervalMs) {
          fastKeyCountRef.current += 1;
        } else {
          fastKeyCountRef.current = 0;
          if (bufferRef.current.length > 0) {
            bufferRef.current = "";
          }
        }

        bufferRef.current += e.key;

        // Auto-clear buffer after 250ms of inactivity
        setTimeout(() => {
          if (Date.now() - lastKeyTimeRef.current >= 200) {
            bufferRef.current = "";
            fastKeyCountRef.current = 0;
          }
        }, 250);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, minChars, maxIntervalMs]);
}
