import { randomUUID } from "node:crypto";
import path from "node:path";

const STORAGE_PATH = process.env.STORAGE_PATH ?? "/data/files";

/** Génère un storageKey unique (UUID, sans extension révélatrice). */
export function generateStorageKey(): string {
  return randomUUID();
}

/** Résout le chemin absolu d'un fichier sur disque. */
export function getFilePath(storageKey: string): string {
  // Sécurité : on impose que la clé soit un UUID, pas de slash, pas de '..'
  if (!/^[a-f0-9-]{36}$/i.test(storageKey)) {
    throw new Error("storageKey invalide");
  }
  return path.join(STORAGE_PATH, storageKey);
}

export const MAX_UPLOAD_SIZE_BYTES =
  Number(process.env.MAX_UPLOAD_SIZE_MB ?? 1024) * 1024 * 1024;

export { STORAGE_PATH };
