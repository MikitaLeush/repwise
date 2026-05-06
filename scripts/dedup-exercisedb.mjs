/**
 * Fetches exercises from wger.de + keeps original exercisedb.dev entries.
 * Only includes exercises that have at least one image.
 * Stores gifUrl (start/main) and gifUrl2 (contracted).
 * Run: node scripts/dedup-exercisedb.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'exercisedb.ts');

// wger body category IDs → bodyPart string (matches ExerciseLibraryScreen filters)
const CATEGORY_MAP = {
  8: 'upper arms', 9: 'upper legs', 10: 'back', 11: 'chest',
  12: 'shoulders', 13: 'waist', 14: 'calves', 15: 'lower arms',
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

async function fetchAllWger() {
  const exercises = [];
  let url = 'https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=100&offset=0';
  let page = 0;

  while (url) {
    page++;
    process.stdout.write(`  wger page ${page} …\r`);
    const data = await fetchJson(url);

    for (const item of data.results ?? []) {
      // Must have at least one image
      if (!item.images?.length) continue;

      const translation = item.translations?.find(t => t.language === 2);
      if (!translation?.name?.trim()) continue;

      const name = translation.name.toLowerCase().trim();
      // Filter out very short names or clearly broken entries
      if (name.length < 3) continue;

      const categoryId = item.category?.id;
      const bodyPart = CATEGORY_MAP[categoryId] ?? 'back';
      const muscles = (item.muscles ?? []).map(m => (m.name_en ?? '').toLowerCase()).filter(Boolean);
      const musclesSecondary = (item.muscles_secondary ?? []).map(m => (m.name_en ?? '').toLowerCase()).filter(Boolean);
      const equipment = (item.equipment ?? []).map(e => (e.name ?? '').toLowerCase()).filter(Boolean);

      // Sort: isMain first, then others
      const sorted = [...item.images].sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0));
      const gifUrl = sorted[0].image.startsWith('http')
        ? sorted[0].image
        : `https://wger.de${sorted[0].image}`;
      const gifUrl2 = sorted[1]?.image
        ? (sorted[1].image.startsWith('http') ? sorted[1].image : `https://wger.de${sorted[1].image}`)
        : undefined;

      // Clean up instructions HTML
      const rawDesc = translation.description ?? '';
      const cleanDesc = rawDesc.replace(/<[^>]+>/g, '').trim();
      const instructions = cleanDesc ? [cleanDesc] : [];

      const entry = {
        id: `wger_${item.id}`,
        name,
        bodyParts: [bodyPart],
        targetMuscles: muscles.slice(0, 3),
        secondaryMuscles: musclesSecondary.slice(0, 3),
        equipments: equipment.slice(0, 2),
        instructions,
        gifUrl,
        ...(gifUrl2 ? { gifUrl2 } : {}),
      };
      exercises.push(entry);
    }

    url = data.next ?? null;
    if (page >= 20) break; // safety cap at 2000 exercises
  }
  console.log(`\n  wger: fetched ${exercises.length} exercises with images`);
  return exercises;
}

async function main() {
  // ── Step 1: Keep original 25 exercisedb.dev entries ──────────────────────────
  console.log('Reading existing exercisedb.ts for original GIF entries…');
  const src = fs.readFileSync(OUT_PATH, 'utf-8');
  const match = src.match(/export const exerciseDB[^=]*=\s*(\[[\s\S]*\]);?\s*$/);
  if (!match) { console.error('Cannot parse exercisedb.ts'); process.exit(1); }

  const existing = JSON.parse(match[1]);
  // Original exercisedb.dev entries have IDs without the "wger_" prefix and have GIF CDN URLs
  const originalDB = existing.filter(e =>
    !e.id.startsWith('wger_') &&
    e.gifUrl &&
    e.gifUrl.includes('static.exercisedb.dev')
  );
  console.log(`  Kept ${originalDB.length} original exercisedb.dev entries (animated GIFs)`);

  // ── Step 2: Fetch wger exercises (images only) ────────────────────────────────
  console.log('\nFetching wger exercises with images…');
  const wgerExercises = await fetchAllWger();

  // ── Step 3: Merge, deduplicate by name ───────────────────────────────────────
  const allNames = new Set(originalDB.map(e => e.name.toLowerCase().trim()));
  const mergedWger = wgerExercises.filter(e => !allNames.has(e.name.toLowerCase().trim()));

  const all = [...originalDB, ...mergedWger];
  all.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\nTotal: ${all.length} exercises (${originalDB.length} animated GIFs + ${mergedWger.length} static images)`);
  console.log(`Writing to ${OUT_PATH}…`);

  const content = `import type { ExerciseDBEntry } from '../types';\n\nexport const exerciseDB: ExerciseDBEntry[] = ${JSON.stringify(all, null, 2)};\n`;
  fs.writeFileSync(OUT_PATH, content, 'utf-8');
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
