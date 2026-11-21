// Spanish-friendly answer normalization + typo-tolerant matching.

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Exact match, or one-typo tolerance for answers of 5+ chars. */
export function matchesAnswer(input: string, display: string, aliases: string[]): boolean {
  const n = normalize(input);
  if (n.length < 2) return false;
  const candidates = [display, ...aliases].map(normalize).filter(Boolean);
  return candidates.some((c) => c === n || (c.length >= 5 && n.length >= 5 && levenshtein(c, n) <= 1));
}
