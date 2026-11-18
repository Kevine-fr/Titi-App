import { describe, expect, it } from "vitest";
import { decoderNomFichier } from "@/lib/nom-fichier";

describe("decoderNomFichier", () => {
  it("décode un nom encodé URL", () => {
    expect(decoderNomFichier(encodeURIComponent("Thèse – version 2.pdf"))).toBe("Thèse – version 2.pdf");
  });

  it("un % mal encodé ne fait plus planter la route (500 avant)", () => {
    expect(decoderNomFichier("100%.pdf")).toBeNull();
  });

  it("retire chemins et caractères de contrôle", () => {
    expect(decoderNomFichier(encodeURIComponent("../../etc/passwd"))).toBe("passwd");
    expect(decoderNomFichier(encodeURIComponent("a\r\nb.pdf"))).toBe("ab.pdf");
    expect(decoderNomFichier(encodeURIComponent(".."))).toBeNull();
    expect(decoderNomFichier("")).toBeNull();
    expect(decoderNomFichier(null)).toBeNull();
  });

  it("limite la longueur", () => {
    expect(decoderNomFichier("a".repeat(400))!.length).toBe(255);
  });
});
