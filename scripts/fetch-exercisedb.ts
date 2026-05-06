/**
 * Fetches all exercises from the free exercisedb.dev public API and writes
 * src/data/exercisedb.ts with deduplicated data.
 *
 * Run with:  bun scripts/fetch-exercisedb.ts
 *        or: npx ts-node --esm scripts/fetch-exercisedb.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = 'https://exercisedb.dev/api/v2/exercises';
const PAGE_SIZE = 100;
const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'exercisedb.ts');

interface RawExercise {
  id: string;
  name: string;
  bodyParts: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipments: string[];
  instructions: string[];
  gifUrl: string;
}

interface ApiResponse {
  success?: boolean;
  data?: {
    exercises: RawExercise[];
    nextPage?: string | null;
  };
  // Some versions return the array directly
  [key: number]: RawExercise;
  length?: number;
}

async function fetchPage(offset: number): Promise<RawExercise[]> {
  const url = `${API_BASE}?limit=${PAGE_SIZE}&offset=${offset}`;
  console.log(`  GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
  const json = await res.json() as ApiResponse | RawExercise[];

  // Handle both response shapes: array or { success, data: { exercises } }
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object' && 'data' in json && json.data?.exercises) {
    return json.data.exercises;
  }
  // Fallback: treat as empty
  console.warn('  Unexpected response shape:', JSON.stringify(json).slice(0, 200));
  return [];
}

async function main() {
  const seen = new Set<string>();
  const all: RawExercise[] = [];
  let offset = 0;
  let emptyStreak = 0;

  console.log('Fetching exercises from exercisedb.dev…');

  while (emptyStreak < 3) {
    const page = await fetchPage(offset);

    if (page.length === 0) {
      emptyStreak++;
      if (emptyStreak >= 3) break;
      offset += PAGE_SIZE;
      continue;
    }

    emptyStreak = 0;
    let newInPage = 0;

    for (const ex of page) {
      if (!ex.id || seen.has(ex.id)) continue;
      seen.add(ex.id);
      all.push({
        id: ex.id,
        name: ex.name ?? '',
        bodyParts: ex.bodyParts ?? [],
        targetMuscles: ex.targetMuscles ?? [],
        secondaryMuscles: ex.secondaryMuscles ?? [],
        equipments: ex.equipments ?? [],
        instructions: ex.instructions ?? [],
        gifUrl: ex.gifUrl ?? `https://static.exercisedb.dev/media/${ex.id}.gif`,
      });
      newInPage++;
    }

    console.log(`  offset=${offset}: ${page.length} received, ${newInPage} new (total unique: ${all.length})`);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (all.length === 0) {
    console.error('No exercises fetched — aborting. The API may have changed or be unavailable.');
    process.exit(1);
  }

  // Sort alphabetically by name for stable output
  all.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\nWriting ${all.length} exercises to ${OUT_PATH}…`);

  const content = `import type { ExerciseDBEntry } from '../types';\n\nexport const exerciseDB: ExerciseDBEntry[] = ${JSON.stringify(all, null, 2)};\n`;

  fs.writeFileSync(OUT_PATH, content, 'utf-8');
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
