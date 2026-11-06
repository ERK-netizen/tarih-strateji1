// game-icons.net simgelerinden (CC BY 3.0) oyunun kullandıklarını çıkarır: yol verisi (512×512).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DONEMLER } from '../../engine/src/donem.ts';

const require = createRequire(import.meta.url);
const set = require('@iconify-json/game-icons/icons.json') as { icons: Record<string, { body: string }> };
const ARAYUZ = ['crown', 'crossed-swords', 'anvil', 'dove', 'scroll-unfurled', 'histogram', 'quill-ink', 'save', 'castle', 'factory', 'railway', 'road', 'hourglass', 'play-button', 'pause-button',
  'fast-forward-button', 'next-button', 'coins', 'wheat', 'three-friends', 'scales', 'magnifying-glass', 'globe', 'barracks', 'flag-objective', 'shield', 'cancel', 'check-mark', 'help', 'exit-door', 'telescope',
  'battleship', 'submarine', 'anchor', 'galleon', 'jet-fighter', 'biplane', 'bomber', 'vote', 'village', 'modern-city', 'mining', 'oil-drum', 'oil-pump', 'person', 'skull-crossed-bones',
  'megaphone', 'podium', 'cow', 'barn', 'trade', 'shaking-hands', 'cash', 'bank', 'gears', 'atom', 'rocket', 'radar-dish', 'world', 'greek-temple', 'handcuffs', 'scroll-quill'];
const ad = new Set<string>(ARAYUZ);
for (const d of Object.values(DONEMLER)) for (const s of Object.values(d.simge)) ad.add(s);
const out: Record<string, string> = {};
for (const a of [...ad].sort()) {
  const i = set.icons[a];
  if (!i) throw new Error(`simge yok: ${a}`);
  const d = [...i.body.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
  out[a] = d;
}
const kok = join(dirname(fileURLToPath(import.meta.url)), '../../..');
writeFileSync(join(kok, 'data/derlenmis/simgeler.json'), JSON.stringify(out));
console.log(`simgeler: ${Object.keys(out).length}`);
