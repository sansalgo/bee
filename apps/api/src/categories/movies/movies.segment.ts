import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"

const DATA_DIR = new URL("../../../data/", import.meta.url)

/**
 * Splits a spaceless tile key back into words ("THEDARKKNIGHT" -> "the dark
 * knight") so it can be used as an external search query — TMDB's search
 * doesn't match concatenated titles. Uses the wordninja approach: a Viterbi
 * pass over a frequency-ranked word list where a word's cost follows Zipf's
 * law, so the most probable split wins. The list is wordninja's
 * (MIT, Derek Anderson), bundled at apps/api/data/words.txt.gz.
 */
export class WordSegmenter {
  private readonly costs = new Map<string, number>()
  private readonly maxWordLength: number

  constructor(rankedWords: string[]) {
    const logCount = Math.log(rankedWords.length)
    let maxWordLength = 1
    rankedWords.forEach((word, rank) => {
      if (this.costs.has(word)) return
      this.costs.set(word, Math.log((rank + 1) * logCount))
      maxWordLength = Math.max(maxWordLength, word.length)
    })
    this.maxWordLength = maxWordLength
  }

  /** Segments letter runs; digit runs are kept as their own words ("IRONMAN2" -> "iron man 2"). */
  segment(key: string): string {
    const runs = key.toLowerCase().match(/[a-z]+|[0-9]+/g) ?? []
    return runs.flatMap((run) => (/^[0-9]/.test(run) ? [run] : this.segmentLetters(run))).join(" ")
  }

  private segmentLetters(text: string): string[] {
    // best[i] = [cost, length of last word] for the cheapest split of text[0, i)
    const best: [number, number][] = [[0, 0]]
    for (let i = 1; i <= text.length; i++) {
      let candidate: [number, number] = [Infinity, 1]
      for (let k = 1; k <= Math.min(i, this.maxWordLength); k++) {
        // Unknown chunks are allowed but priced so high they only win when
        // nothing else covers those letters.
        const cost = best[i - k]![0] + (this.costs.get(text.slice(i - k, i)) ?? 1e9 * k)
        if (cost < candidate[0]) candidate = [cost, k]
      }
      best.push(candidate)
    }
    const words: string[] = []
    for (let i = text.length; i > 0; i -= best[i]![1]) {
      words.unshift(text.slice(i - best[i]![1], i))
    }
    return words
  }
}

let bundled: WordSegmenter | undefined

/**
 * Lazily loads the bundled list once per process, appending words from our
 * own movie dataset (as the rarest entries) so title-specific words like
 * character names still segment cleanly.
 */
export function getBundledSegmenter(): WordSegmenter {
  if (!bundled) {
    const words = gunzipSync(readFileSync(new URL("words.txt.gz", DATA_DIR)))
      .toString("utf-8")
      .split(/\r?\n/)
      .map((word) => word.replace(/[^a-z0-9]/g, ""))
      .filter((word) => word.length > 0)
    const movies = JSON.parse(readFileSync(new URL("movies.json", DATA_DIR), "utf-8")) as { title: string }[]
    const titleWords = movies.flatMap((movie) => movie.title.toLowerCase().match(/[a-z]+/g) ?? [])
    bundled = new WordSegmenter([...words, ...titleWords])
  }
  return bundled
}
