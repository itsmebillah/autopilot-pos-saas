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
 */
export function useBarcodeScanner({
  onScan,
  minChars = 3,
  maxIntervalMs = 60,
  enabled = true,
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
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
      const isInputFocused =
        Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable));

      const currentTime = Date.now();
      const interval = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        const barcode = bufferRef.current.trim();
        bufferRef.current = "";

        if (barcode.length >= minChars) {
          // If in an active input, prevent standard form submit if it was a hardware scanner burst
          if (isInputFocused && interval <= maxIntervalMs * 2) {
            e.preventDefault();
            e.stopPropagation();
          }
          onScanRef.current(barcode);
        }
        return;
      }

      // If key is a printable character (length 1)
      if (e.key.length === 1) {
        // If the typing speed is slow (> maxIntervalMs), reset buffer unless it's starting fresh
        if (interval > maxIntervalMs && bufferRef.current.length > 0) {
          bufferRef.current = "";
        }

        bufferRef.current += e.key;

        // Auto-clear buffer after 300ms of inactivity to prevent accidental concatenation
        setTimeout(() => {
          if (Date.now() - lastKeyTimeRef.current >= 250) {
            bufferRef.current = "";
          }
        }, 300);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, minChars, maxIntervalMs]);
}
