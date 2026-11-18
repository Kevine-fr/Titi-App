import { describe, expect, it } from "vitest";
import { instrumenter, registry } from "@/lib/metrics";

describe("métriques HTTP", () => {
  it("compte la requête sous le modèle de route et son code", async () => {
    const h = instrumenter("/api/stream/[id]", async () => new Response("x", { status: 206 }));
    await h(new Request("http://t/api/stream/abc"));
    const texte = await registry.metrics();
    expect(texte).toMatch(
      /http_requests_total\{method="GET",route="\/api\/stream\/\[id\]",status_code="206"\} 1/,
    );
    expect(texte).toContain("http_request_duration_seconds_bucket");
    expect(texte).toContain("process_cpu_seconds_total");
  });

  it("une exception compte comme 500 et remonte", async () => {
    const h = instrumenter("/api/boum", async () => {
      throw new Error("boum");
    });
    await expect(h(new Request("http://t/api/boum", { method: "POST" }))).rejects.toThrow("boum");
    expect(await registry.metrics()).toMatch(/route="\/api\/boum",status_code="500"/);
  });

  it("expose les métriques métier", async () => {
    const texte = await registry.metrics();
    expect(texte).toContain("titi_televersements_total");
    expect(texte).toContain("titi_stockage_octets");
  });
});
