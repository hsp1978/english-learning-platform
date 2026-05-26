export function normalizeUtterance(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z\s']/g, "").replace(/\s+/g, " ");
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function scorePronunciation(target: string, spoken: string): {
  isCorrect: boolean;
  isClose: boolean;
} {
  const t = normalizeUtterance(target);
  const s = normalizeUtterance(spoken);

  if (!t || !s) return { isCorrect: false, isClose: false };

  if (s === t) return { isCorrect: true, isClose: true };

  const spokenWords = s.split(" ").filter(Boolean);
  if (spokenWords.includes(t)) return { isCorrect: true, isClose: true };

  const tolerance = t.length <= 3 ? 0 : t.length <= 6 ? 1 : 2;
  const bestDistance = spokenWords.reduce(
    (min, w) => Math.min(min, editDistance(w, t)),
    Infinity,
  );

  if (bestDistance <= tolerance) return { isCorrect: true, isClose: true };
  if (bestDistance <= tolerance + 1) return { isCorrect: false, isClose: true };

  return { isCorrect: false, isClose: false };
}
