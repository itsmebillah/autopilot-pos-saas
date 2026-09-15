/**
 * Quick Cash Preset Generator & POS Financial Calculator
 *
 * Provides mathematically sound, adaptive quick-cash presets based on the current payable amount.
 * Follows real-world cash retail denomination rounding rules.
 */

export interface QuickCashPreset {
  label: string;
  amount: number;
  isExact?: boolean;
}

/**
 * Generates sensible, adaptive quick cash presets based on the payable amount.
 *
 * @param payable Total amount to be paid (must be >= 0)
 * @returns Array of unique preset amounts in ascending order starting with Exact
 *
 * Examples:
 * - 2120   -> [2120, 2500, 3000, 5000]
 * - 850    -> [850, 1000, 1500, 2000]
 * - 12700  -> [12700, 13000, 15000, 20000]
 * - 45     -> [45, 50, 100, 200, 500]
 */
export function generateQuickCashPresets(payable: number): number[] {
  const roundedPayable = Math.max(0, Math.round(payable));
  if (roundedPayable === 0) return [0];

  const presets = new Set<number>();
  presets.add(roundedPayable);

  if (roundedPayable <= 50) {
    [50, 100, 200, 500].forEach((v) => {
      if (v > roundedPayable) presets.add(v);
    });
  } else if (roundedPayable <= 500) {
    // Round to nearest 50, 100, 500
    const step50 = Math.ceil(roundedPayable / 50) * 50;
    const step100 = Math.ceil(roundedPayable / 100) * 100;
    const step500 = Math.ceil(roundedPayable / 500) * 500;
    const next1000 = 1000;

    [step50, step100, step500, next1000].forEach((v) => {
      if (v > roundedPayable) presets.add(v);
    });
  } else if (roundedPayable <= 2000) {
    // E.g. 850 -> 1000, 1500, 2000
    const step100 = Math.ceil(roundedPayable / 100) * 100;
    const step500 = Math.ceil(roundedPayable / 500) * 500;
    const step1000 = Math.ceil(roundedPayable / 1000) * 1000;
    const next500 = (step500 === roundedPayable || step500 < roundedPayable + 200) ? step500 + 500 : step500;

    [step100, step500, next500, step1000, 2000].forEach((v) => {
      if (v > roundedPayable) presets.add(v);
    });
  } else if (roundedPayable <= 10000) {
    // E.g. 2120 -> 2500, 3000, 5000
    const step500 = Math.ceil(roundedPayable / 500) * 500;
    const step1000 = Math.ceil(roundedPayable / 1000) * 1000;
    const step5000 = Math.ceil(roundedPayable / 5000) * 5000;

    [step500, step1000, step5000, 10000].forEach((v) => {
      if (v > roundedPayable) presets.add(v);
    });
  } else if (roundedPayable <= 50000) {
    // E.g. 12700 -> 13000, 15000, 20000
    const step1000 = Math.ceil(roundedPayable / 1000) * 1000;
    const step5000 = Math.ceil(roundedPayable / 5000) * 5000;
    const step10000 = Math.ceil(roundedPayable / 10000) * 10000;
    const step20000 = Math.ceil(roundedPayable / 20000) * 20000;

    [step1000, step5000, step10000, step20000].forEach((v) => {
      if (v > roundedPayable) presets.add(v);
    });
  } else {
    // Large amounts > 50,000
    const step5000 = Math.ceil(roundedPayable / 5000) * 5000;
    const step10000 = Math.ceil(roundedPayable / 10000) * 10000;
    const step50000 = Math.ceil(roundedPayable / 50000) * 50000;

    [step5000, step10000, step50000].forEach((v) => {
      if (v > roundedPayable) presets.add(v);
    });
  }

  // Sort ascending and cap to top 4 options (Exact + 3 higher denominations)
  const sorted = Array.from(presets).sort((a, b) => a - b);
  const exact = sorted[0];
  const higher = sorted.slice(1).slice(0, 3);

  return [exact, ...higher];
}

/**
 * Calculates payment financial state synchronously.
 *
 * @param payable Net payable total
 * @param paid Amount paid/tendered by customer
 * @returns Financial breakdown with non-overlapping change/due values
 */
export function calculatePaymentSummary(payable: number, paid: number) {
  const cleanPayable = Math.max(0, Number(payable) || 0);
  const cleanPaid = Math.max(0, Number(paid) || 0);

  const change = Math.max(0, cleanPaid - cleanPayable);
  const due = Math.max(0, cleanPayable - cleanPaid);
  const isFullyPaid = due === 0;

  return {
    payable: cleanPayable,
    paid: cleanPaid,
    change: Math.round(change * 100) / 100,
    due: Math.round(due * 100) / 100,
    isFullyPaid,
    isOverpaid: change > 0,
    isUnderpaid: due > 0,
  };
}
