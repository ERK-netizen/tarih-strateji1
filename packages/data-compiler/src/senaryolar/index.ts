// Bütün senaryoları derler: node --experimental-strip-types packages/data-compiler/src/senaryolar/index.ts [kimlik…]
import { yaz } from '../senaryo.ts';
import { S1914 } from './s1914.ts';
import { S1939 } from './s1939.ts';
import { S2026 } from './s2026.ts';

const sec = process.argv.slice(2);
const hepsi = [S1914, S1939, S2026];
yaz(sec.length ? hepsi.filter((s) => sec.includes(s.kimlik)) : hepsi);
