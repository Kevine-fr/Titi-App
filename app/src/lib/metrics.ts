import { Registry, collectDefaultMetrics } from 'prom-client';

// Singleton : évite la double-inscription des métriques (HMR en dev, réimports).
const globalForMetrics = globalThis as unknown as {
  __promRegistry?: Registry;
};

function createRegistry(): Registry {
  const registry = new Registry();
  // Métriques runtime Node.js : heap, GC, event-loop lag, CPU, fds, etc.
  collectDefaultMetrics({ register: registry });
  return registry;
}

export const registry: Registry =
  globalForMetrics.__promRegistry ?? createRegistry();

if (!globalForMetrics.__promRegistry) {
  globalForMetrics.__promRegistry = registry;
}
