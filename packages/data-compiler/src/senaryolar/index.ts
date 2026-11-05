// Bütün senaryoları derler: node --experimental-strip-types packages/data-compiler/src/senaryolar/index.ts
import { yaz } from '../senaryo.ts';
import { S1914 } from './s1914.ts';

const sec = process.argv.slice(2);
const hepsi = [S1914];
yaz(sec.length ? hepsi.filter((s) => sec.includes(s.kimlik)) : hepsi);
