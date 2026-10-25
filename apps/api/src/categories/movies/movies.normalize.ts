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

/** Variants shorter than this (normalized) are too easy to stumble into to count as a title. */
const MIN_ALIAS_KEY_LENGTH = 3
const MAX_ALIASES_PER_TITLE = 8

const ROMAN_NUMERALS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]
const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
]

/**
 * Each rewrite returns an alternative spelling players plausibly build for
 * the same movie, or null when it doesn't apply. Kept as whole-word rewrites
 * so they never mangle the inside of a word ("Theater" keeps its "The").
 */
const ALIAS_REWRITES: ((title: string) => string | null)[] = [
  // "The Avengers" -> "Avengers"
  (title) => rewriteIfChanged(title, title.replace(/^(the|a|an)\s+/i, "")),
  // "Fast & Furious" <-> "Fast and Furious"
  (title) => rewriteIfChanged(title, title.replace(/\s*&\s*/g, " and ")),
  (title) => rewriteIfChanged(title, title.replace(/\s+and\s+/gi, " & ")),
  // "Rocky II" <-> "Rocky 2" (trailing sequel numbers only)
  (title) =>
    rewriteIfChanged(
      title,
      title.replace(/\s(II|III|IV|V|VI|VII|VIII|IX|X)$/i, (_, roman: string) => ` ${ROMAN_NUMERALS.indexOf(roman.toUpperCase())}`),
    ),
  (title) =>
    rewriteIfChanged(
      title,
      title.replace(/\s([2-9]|10)$/, (_, digits: string) => ` ${ROMAN_NUMERALS[Number(digits)]}`),
    ),
  // "Ocean's Eleven" <-> "Ocean's 11"
  (title) =>
    rewriteIfChanged(
      title,
      title.replace(/\b[a-z]+\b/gi, (word) => {
        const idx = NUMBER_WORDS.indexOf(word.toLowerCase())
        return idx === -1 ? word : String(idx)
      }),
    ),
  (title) =>
    rewriteIfChanged(
      title,
      title.replace(/\b\d+\b/g, (digits) => NUMBER_WORDS[Number(digits)] ?? digits),
    ),
  // "Amélie" -> "Amelie" (normalizeMovieTitle would otherwise drop the accented letter)
  (title) => rewriteIfChanged(title, title.normalize("NFD").replace(/[̀-ͯ]/g, "")),
]

function rewriteIfChanged(original: string, rewritten: string): string | null {
  const trimmed = rewritten.trim()
  return trimmed !== original && trimmed.length > 0 ? trimmed : null
}

/**
 * Derives alternative titles a movie should also be findable by, e.g.
 * "The Avengers" -> ["Avengers"]. Rewrites are applied repeatedly so they
 * combine ("The Fast & the Furious" -> "Fast and the Furious"), capped at
 * MAX_ALIASES_PER_TITLE. Only variants whose normalized key differs from the
 * title's own (and from each other) are returned.
 */
export function deriveAliasTitles(title: string): string[] {
  const seenKeys = new Set([normalizeMovieTitle(title)])
  const aliases: string[] = []
  const queue = [title]
  while (queue.length > 0 && aliases.length < MAX_ALIASES_PER_TITLE) {
    const current = queue.shift()!
    for (const rewrite of ALIAS_REWRITES) {
      const variant = rewrite(current)
      if (!variant) continue
      const key = normalizeMovieTitle(variant)
      if (key.length < MIN_ALIAS_KEY_LENGTH || seenKeys.has(key)) continue
      seenKeys.add(key)
      aliases.push(variant)
      queue.push(variant)
      if (aliases.length >= MAX_ALIASES_PER_TITLE) break
    }
  }
  return aliases
}
