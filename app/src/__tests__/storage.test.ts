import { describe, expect, it } from "vitest";
import { getFilePath } from "@/lib/storage";
import { formatBytes } from "@/lib/format";

describe("stockage", () => {
  it("refuse toute clé qui n'est pas un UUID (traversée de chemin)", () => {
    expect(() => getFilePath("../../etc/passwd")).toThrow();
    expect(() => getFilePath("abc")).toThrow();
    expect(getFilePath("123e4567-e89b-12d3-a456-426614174000")).toMatch(/123e4567-e89b-12d3-a456-426614174000$/);
  });

  it("formate les tailles", () => {
    expect(formatBytes(512)).toBe("512 o");
    expect(formatBytes(2048)).toBe("2.0 Ko");
    expect(formatBytes(BigInt(3 * 1024 ** 3))).toBe("3.00 Go");
  });
});
