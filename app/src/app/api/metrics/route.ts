import { registry } from '@/lib/metrics';

// Doit tourner côté Node (prom-client) et ne jamais être mis en cache.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const body = await registry.metrics();
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': registry.contentType },
  });
}
