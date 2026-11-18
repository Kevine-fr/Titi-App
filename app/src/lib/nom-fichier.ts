/**
 * Nom de fichier reçu dans l'en-tête X-File-Name (encodé URL par le client).
 *
 * `decodeURIComponent` lève une exception sur un `%` isolé (« 100%.pdf » mal
 * encodé) : la route répondait 500 au lieu de dire ce qui n'allait pas. Et le
 * nom finit dans Content-Disposition et dans la page publique : on retire les
 * caractères de contrôle et les chemins.
 */
export function decoderNomFichier(brut: string | null): string | null {
  if (!brut) return null;
  let nom: string;
  try {
    nom = decodeURIComponent(brut);
  } catch {
    return null;
  }
  nom = nom
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .split(/[\\/]/)
    .pop()!
    .trim();
  if (!nom || nom === "." || nom === "..") return null;
  return nom.slice(0, 255);
}
