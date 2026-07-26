/**
 * Normalizes a movie title into the key used for tile-sequence matching.
 * Uppercases and strips every character with no tile representation
 * (spaces, hyphens, colons, apostrophes, ...) while keeping digits
 * significant, since titles like "Iron Man 2" must stay distinguishable
 * from "Iron Man". Used identically at import time (to compute
 * `Movie.normalizedKey`) and at match time (on submitted tile sequences),
 * so the two can never drift apart.
 */
export function normalizeMovieTitle(title: string): string {
  return title.toUpperCase().replace(/[^A-Z0-9]/g, "")
}
