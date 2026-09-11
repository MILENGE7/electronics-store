// Deterministic "related products" heuristic — not AI, not machine-learned.
// Kept isolated so it can be swapped out later without touching call sites.
//
// Scoring (higher = more relevant):
//   same category   +50
//   same brand      +30
//   in stock        +20
//   price within ~30% of the current product  +10
//   already in recently-viewed history         -20 (soft deprioritization, not exclusion)
export function scoreCandidate(candidate, current, recentlyViewedIds = []) {
  let score = 0;

  if (candidate.category?.name && current.category?.name && candidate.category.name === current.category.name) {
    score += 50;
  }

  if (candidate.brand && current.brand && candidate.brand.trim().toLowerCase() === current.brand.trim().toLowerCase()) {
    score += 30;
  }

  if (Number(candidate.stock) > 0) {
    score += 20;
  }

  const currentPrice = Number(current.price);
  const candidatePrice = Number(candidate.price);
  if (Number.isFinite(currentPrice) && currentPrice > 0 && Number.isFinite(candidatePrice)) {
    const diffRatio = Math.abs(candidatePrice - currentPrice) / currentPrice;
    if (diffRatio <= 0.3) score += 10;
  }

  if (recentlyViewedIds.includes(candidate.id)) {
    score -= 20;
  }

  return score;
}

// Ranks `candidates` against `current` and returns the top `limit`, excluding
// the current product and any duplicate IDs in the candidate pool.
export function getRelatedProducts(candidates, current, recentlyViewedIds = [], limit = 4) {
  if (!current) return [];

  const seen = new Set();
  const deduped = [];
  for (const p of candidates) {
    if (p.id === current.id || seen.has(p.id)) continue;
    seen.add(p.id);
    deduped.push(p);
  }

  return deduped
    .map((product) => ({ product, score: scoreCandidate(product, current, recentlyViewedIds) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);
}
