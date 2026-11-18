/**
 * Lecture de l'en-tête HTTP Range (RFC 9110 §14.1.2), une seule plage.
 *
 * Avant : seule la forme `bytes=début-fin` était comprise, et une fin au-delà
 * du fichier donnait 416. Or la RFC demande de ramener la fin à la taille du
 * fichier, et certains lecteurs PDF demandent la fin du document par suffixe
 * (`bytes=-1024`, où se trouve la table des objets) : ils recevaient 416 et
 * retombaient sur un téléchargement complet du PDF, jusqu'à 1 Go.
 */
export type Plage = { start: number; end: number };

/**
 * @returns la plage à servir, `"invalide"` (→ 416) ou `null` si l'en-tête est
 *          absent ou ignoré (→ 200 complet, ce que la RFC autorise).
 */
export function lirePlage(entete: string | null, taille: number): Plage | "invalide" | null {
  if (!entete) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(entete.trim());
  // Plusieurs plages (`bytes=0-1,5-6`) : on sert le fichier entier plutôt
  // que du multipart/byteranges, ce que la RFC autorise.
  if (!m) return entete.includes(",") ? null : "invalide";
  const [, debut, fin] = m;
  if (debut === "" && fin === "") return "invalide";
  if (taille === 0) return "invalide";

  if (debut === "") {
    // Suffixe : les N derniers octets.
    const n = Number(fin);
    if (n === 0) return "invalide";
    return { start: Math.max(0, taille - n), end: taille - 1 };
  }

  const start = Number(debut);
  const end = fin === "" ? taille - 1 : Math.min(Number(fin), taille - 1);
  if (start >= taille || start > end) return "invalide";
  return { start, end };
}
