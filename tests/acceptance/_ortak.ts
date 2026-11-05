import { readFileSync } from 'node:fs';
import { senaryoBaslat, gunIlerle, type Paket, type World } from '@ts/engine';
export const pkg = JSON.parse(readFileSync('data/derlenmis/fixture-1a.json', 'utf8')) as Paket;
export function dunya(oyuncu = 0, mod = 2): World { return senaryoBaslat(JSON.parse(JSON.stringify(pkg)) as Paket, oyuncu, mod); }
export function ilerle(w: World, n: number): string[] { const h: string[] = []; for (let i = 0; i < n; i++) h.push(gunIlerle(w).hash); return h; }
