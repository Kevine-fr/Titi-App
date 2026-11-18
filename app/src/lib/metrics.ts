import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Métriques Prometheus de Titi, lues sur /api/metrics par le Prometheus du
 * dépôt Infrastructure (job `titi-app`).
 *
 * Mêmes noms et étiquettes que les autres applications Node du VPS
 * (FindUrJob, Portfolio) : `http_requests_total` et
 * `http_request_duration_seconds` {method, route, status_code}, pour que les
 * tableaux Grafana soient les mêmes partout. Avant, seules les métriques du
 * processus existaient : impossible de voir une route en erreur.
 */

// Singleton : évite la double-inscription des métriques (HMR en dev, réimports).
type Metriques = {
  registry: Registry;
  requetes: Counter<'method' | 'route' | 'status_code'>;
  duree: Histogram<'method' | 'route' | 'status_code'>;
  televersements: Counter<'resultat'>;
  octetsTeleverses: Counter;
  fichiers: Gauge;
  stockage: Gauge;
};

const globalForMetrics = globalThis as unknown as { __titiMetriques?: Metriques };

function creer(): Metriques {
  const registry = new Registry();
  // Métriques runtime Node.js : heap, GC, event-loop lag, CPU, fds, etc.
  collectDefaultMetrics({ register: registry });
  return {
    registry,
    requetes: new Counter({
      name: 'http_requests_total',
      help: 'Requêtes HTTP traitées par les routes API',
      labelNames: ['method', 'route', 'status_code'],
      registers: [registry],
    }),
    duree: new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Durée des requêtes HTTP des routes API',
      labelNames: ['method', 'route', 'status_code'],
      // Jusqu'à 10 min : un téléversement de 1 Go est une seule requête.
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 120, 600],
      registers: [registry],
    }),
    televersements: new Counter({
      name: 'titi_televersements_total',
      help: 'Téléversements de PDF, par résultat (ok, trop_gros, refuse, erreur)',
      labelNames: ['resultat'],
      registers: [registry],
    }),
    octetsTeleverses: new Counter({
      name: 'titi_televersements_octets_total',
      help: 'Octets reçus par les téléversements réussis',
      registers: [registry],
    }),
    fichiers: new Gauge({
      name: 'titi_fichiers',
      help: 'Nombre de PDF publiés (relu dans la base à chaque collecte)',
      registers: [registry],
    }),
    stockage: new Gauge({
      name: 'titi_stockage_octets',
      help: 'Taille cumulée des PDF publiés (relue dans la base à chaque collecte)',
      registers: [registry],
    }),
  };
}

export const metriques: Metriques = globalForMetrics.__titiMetriques ?? creer();
if (!globalForMetrics.__titiMetriques) globalForMetrics.__titiMetriques = metriques;

export const registry = metriques.registry;

/**
 * Enveloppe un gestionnaire de route : compte la requête et sa durée sous le
 * nom de la route (le modèle, pas l'URL : `/api/stream/[id]`, sinon une
 * série par fichier). Une exception compte comme 500 puis est relancée.
 */
export function instrumenter<R extends Request, A extends unknown[]>(
  route: string,
  gestionnaire: (req: R, ...reste: A) => Promise<Response>,
): (req: R, ...reste: A) => Promise<Response> {
  return async (req, ...reste) => {
    const fin = metriques.duree.startTimer({ method: req.method, route });
    let code = 500;
    try {
      const rep = await gestionnaire(req, ...reste);
      code = rep.status;
      return rep;
    } finally {
      const etiquettes = { method: req.method, route, status_code: String(code) };
      metriques.requetes.inc(etiquettes);
      fin({ status_code: String(code) });
    }
  };
}
