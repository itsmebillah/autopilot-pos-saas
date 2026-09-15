import { describe, it, expect } from "vitest";
import {
  generateStoreBarcode,
  encodeCode128B,
  generateBarcodeSVG,
  isValidBarcode,
} from "../lib/barcode-engine";

describe("Universal Barcode Engine (Code-128 & EAN)", () => {
  it("generates collision-safe barcode with store prefix and date encoding", () => {
    const code1 = generateStoreBarcode("AP");
    const code2 = generateStoreBarcode("AP");
    const codeWatch = generateStoreBarcode("WTC");

    expect(code1).toMatch(/^AP\d{11}$/);
    expect(code2).toMatch(/^AP\d{11}$/);
    expect(codeWatch).toMatch(/^WTC\d{11}$/);
    expect(code1).not.toBe(code2);
  });

  it("calculates exact Code-128B checksum for alphanumeric strings", () => {
    // "AP123" -> StartB (104) + 'A'(33)*1 + 'P'(48)*2 + '1'(17)*3 + '2'(18)*4 + '3'(19)*5
    // 104 + 33 + 96 + 51 + 72 + 95 = 451 % 103 = 39
    const { binary, checkDigit } = encodeCode128B("AP123");
    expect(checkDigit).toBe(39);
    expect(binary.length).toBeGreaterThan(50);
  });

  it("generates valid standalone SVG markup containing rect bars and text label", () => {
    const svg = generateBarcodeSVG("AP-TEST-9988", {
      height: 40,
      barWidth: 2,
      showText: true,
      fontSize: 10,
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<rect");
    expect(svg).toContain("<text");
    expect(svg).toContain("AP-TEST-9988");
  });

  it("generates compact SVG markup when showText is false", () => {
    const svg = generateBarcodeSVG("AP-1002", {
      showText: false,
    });

    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<text");
  });

  it("validates manufacturer barcodes correctly", () => {
    expect(isValidBarcode("8901234567890")).toBe(true);
    expect(isValidBarcode("AP-260915-12345")).toBe(true);
    expect(isValidBarcode("PROD_001.X")).toBe(true);
    expect(isValidBarcode("")).toBe(false);
    expect(isValidBarcode("A")).toBe(false); // too short
    expect(isValidBarcode("INVALID BARCODE WITH SPACES")).toBe(false);
  });
});
