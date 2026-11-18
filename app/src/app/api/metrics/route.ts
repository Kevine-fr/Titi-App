import { metriques, registry } from '@/lib/metrics';
import { prisma } from '@/lib/prisma';

// Doit tourner côté Node (prom-client) et ne jamais être mis en cache.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  // Les jauges métier sont relues à chaque collecte (toutes les 15 s) : une
  // agrégation sur une table indexée, négligeable. Base injoignable : les
  // métriques du processus partent quand même (la base a son propre exporter).
  try {
    const agr = await prisma.file.aggregate({ _count: true, _sum: { size: true } });
    metriques.fichiers.set(agr._count);
    metriques.stockage.set(Number(agr._sum.size ?? 0));
  } catch {
    // jauges laissées à leur dernière valeur
  }
  const body = await registry.metrics();
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': registry.contentType },
  });
}
