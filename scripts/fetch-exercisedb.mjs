/**
 * Fetches all exercises from the free exercisedb OSS API and writes
 * src/data/exercisedb.ts with deduplicated, properly typed data.
 * Run with: node scripts/fetch-exercisedb.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = 'https://oss.exercisedb.dev/api/v1/exercises';
const PAGE_SIZE = 100;
const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'exercisedb.ts');

async function fetchPage(cursor) {
  const url = cursor
    ? `${API_BASE}?limit=${PAGE_SIZE}&cursor=${cursor}`
    : `${API_BASE}?limit=${PAGE_SIZE}`;
  console.log(`  GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json; // { success, meta: { hasNextPage, nextCursor }, data: [...] }
}

async function main() {
  const seen = new Set();
  const all = [];
  let cursor = null;
  let page = 0;

  console.log('Fetching exercises from oss.exercisedb.dev…');

  while (true) {
    const resp = await fetchPage(cursor);
    const exercises = resp.data ?? [];
    const meta = resp.meta ?? {};

    let newInPage = 0;
    for (const ex of exercises) {
      const id = ex.exerciseId ?? ex.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      all.push({
        id,
        name: ex.name ?? '',
        bodyParts: ex.bodyParts ?? [],
        targetMuscles: ex.targetMuscles ?? [],
        secondaryMuscles: ex.secondaryMuscles ?? [],
        equipments: ex.equipments ?? [],
        instructions: ex.instructions ?? [],
        gifUrl: ex.gifUrl ?? `https://static.exercisedb.dev/media/${id}.gif`,
      });
      newInPage++;
    }

    page++;
    console.log(`  page ${page}: ${exercises.length} received, ${newInPage} new (total: ${all.length})`);

    if (!meta.hasNextPage || !meta.nextCursor) break;
    cursor = meta.nextCursor;
  }

  if (all.length === 0) {
    console.error('No exercises fetched — aborting.');
    process.exit(1);
  }

  all.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\nWriting ${all.length} exercises to ${OUT_PATH}…`);

  const content = `import type { ExerciseDBEntry } from '../types';\n\nexport const exerciseDB: ExerciseDBEntry[] = ${JSON.stringify(all, null, 2)};\n`;
  fs.writeFileSync(OUT_PATH, content, 'utf-8');
  console.log('Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
