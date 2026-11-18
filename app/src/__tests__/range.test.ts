import { describe, expect, it } from "vitest";
import { lirePlage } from "@/lib/range";

describe("lirePlage", () => {
  it("sans en-tête : fichier entier", () => {
    expect(lirePlage(null, 100)).toBeNull();
  });

  it("plage classique", () => {
    expect(lirePlage("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
    expect(lirePlage("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
  });

  it("fin au-delà du fichier : ramenée à la taille (RFC 9110), pas 416", () => {
    expect(lirePlage("bytes=50-1000", 100)).toEqual({ start: 50, end: 99 });
  });

  it("suffixe : les N derniers octets (fin du PDF lue en premier)", () => {
    expect(lirePlage("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(lirePlage("bytes=-500", 100)).toEqual({ start: 0, end: 99 });
  });

  it("plages impossibles : 416", () => {
    expect(lirePlage("bytes=100-", 100)).toBe("invalide");
    expect(lirePlage("bytes=9-3", 100)).toBe("invalide");
    expect(lirePlage("bytes=-0", 100)).toBe("invalide");
    expect(lirePlage("bytes=-", 100)).toBe("invalide");
    expect(lirePlage("octets=0-1", 100)).toBe("invalide");
    expect(lirePlage("bytes=0-1", 0)).toBe("invalide");
  });

  it("plusieurs plages : fichier entier", () => {
    expect(lirePlage("bytes=0-1,5-6", 100)).toBeNull();
  });
});
