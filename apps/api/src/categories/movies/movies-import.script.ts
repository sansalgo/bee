/**
 * Re-runnable importer for the user's own movie dataset (CSV or JSON), kept
 * separate from prisma/seed.ts (which only ever seeds small dev fixtures).
 * Safe to run repeatedly: rows are upserted on (normalizedKey, releaseYear).
 *
 * Usage:
 *   bun run movies:import -- --file ./my-movies.csv
 *   bun run movies:import -- --file ./my-movies.json
 *
 * CSV must have a header row with "title" and "releaseYear" (or "year")
 * columns. JSON must be an array of { title, releaseYear } objects.
 */
import { readFileSync } from "node:fs"
import { extname } from "node:path"

import { PrismaClient } from "@prisma/client"

import { normalizeMovieTitle } from "./movies.normalize"

interface ImportRow {
  title: string
  releaseYear: number
}

function parseArgs(): { file: string } {
  const flagIdx = process.argv.indexOf("--file")
  const file = flagIdx !== -1 ? process.argv[flagIdx + 1] : undefined
  if (!file) {
    console.error("Usage: bun run movies:import -- --file <path-to-csv-or-json>")
    process.exit(1)
  }
  return { file }
}

function parseCsv(content: string): ImportRow[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const header = lines[0]
  if (!header) return []
  const columns = header.split(",").map((c) => c.trim().toLowerCase())
  const titleIdx = columns.indexOf("title")
  const yearIdx = columns.includes("releaseyear") ? columns.indexOf("releaseyear") : columns.indexOf("year")
  if (titleIdx === -1 || yearIdx === -1) {
    throw new Error(`CSV must have "title" and "releaseYear" (or "year") columns, got: ${header}`)
  }
  return lines.slice(1).map((line) => {
    const cells = line.split(",")
    return { title: (cells[titleIdx] ?? "").trim(), releaseYear: Number((cells[yearIdx] ?? "").trim()) }
  })
}

function parseJson(content: string): ImportRow[] {
  const data: unknown = JSON.parse(content)
  if (!Array.isArray(data)) {
    throw new Error("JSON dataset must be an array of { title, releaseYear } objects")
  }
  return data.map((row: Record<string, unknown>) => ({
    title: String(row.title),
    releaseYear: Number(row.releaseYear ?? row.year),
  }))
}

async function main() {
  const { file } = parseArgs()
  const content = readFileSync(file, "utf-8")
  const rows = extname(file).toLowerCase() === ".json" ? parseJson(content) : parseCsv(content)

  const prisma = new PrismaClient()
  let imported = 0
  for (const row of rows) {
    if (!row.title || !Number.isFinite(row.releaseYear)) {
      console.warn(`Skipping invalid row: ${JSON.stringify(row)}`)
      continue
    }
    const normalizedKey = normalizeMovieTitle(row.title)
    await prisma.movie.upsert({
      where: { normalizedKey_releaseYear: { normalizedKey, releaseYear: row.releaseYear } },
      update: { title: row.title },
      create: { title: row.title, releaseYear: row.releaseYear, normalizedKey, isFixture: false },
    })
    imported++
  }
  await prisma.$disconnect()
  console.log(`Imported/updated ${imported} of ${rows.length} rows from ${file}.`)
}

void main()
