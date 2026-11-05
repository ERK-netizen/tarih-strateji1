// Başsız laboratuvar koşucusu: motorun aynısı. Kullanım: npm run lab -- [gün] [oyuncu] [tohum]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { senaryoBaslat, gunIlerle, tarihMetni, ortak, ekonomi, siyaset, nufus, serilestir, coz, dunyaHash, type Paket } from '../../engine/src/index.ts';

const kok = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const pkg = JSON.parse(readFileSync(join(kok, 'data/derlenmis/fixture-1a.json'), 'utf8')) as Paket;
const gun = Number(process.argv[2] ?? 365);
const oyuncu = Number(process.argv[3] ?? 2);
if (process.argv[4]) pkg.tohum = Number(process.argv[4]);

const w = senaryoBaslat(pkg, oyuncu, 2); // Gözlemci: oyuncu ülkesi de YZ ile oynar
const t0 = performance.now();
let soguk = 0;
let son = '';
for (let i = 0; i < gun; i++) {
  const s = gunIlerle(w);
  soguk += s.sogukYol;
  son = s.hash;
  for (const b of s.bildirimler) if (['savas', 'baris', 'teslim'].includes(b.tur)) console.log(`  ${tarihMetni(w.gun)}: ${b.metin}`);
}
const ms = performance.now() - t0;
console.log(`\n${gun} gün: ${ms.toFixed(0)} ms (${(ms / gun).toFixed(2)} ms/gün), soğuk yol: ${soguk}, hash ${son}`);
console.log(`Tarih: ${tarihMetni(w.gun)}`);
for (let c = 0; c < w.nC; c++) {
  const C = w.C.c;
  const ig = nufus.insanGucu(w, c);
  const g = siyaset.orduGucu(w, c);
  const { stok, gunluk } = ekonomi.ulkeGidaStok(w, c);
  const bolge = ortak.ulkeBolgeleri(w, c).length;
  console.log(`${pkg.ulkeler[c]!.kod}: bölge ${bolge}, hazine ${C.hazine[c]}, aylık gelir ${C.g1[c]}, huzur ${C.huzur[c]! / 1000}, destek ${C.destek[c]! / 1000}, yorgunluk ${C.yorgunluk[c]! / 1000}, PG ${C.pg[c]! / 1000}, borç ${C.borc[c]}`);
  console.log(`     ordu ${g.tumen} birlik / ${g.kisi} kişi, Y ${ig.Y}, E ${ig.E}, W ${ig.W}, P ${ig.P}, ölü ${C.olu[c]}, gıda ${Math.floor(stok / Math.max(1, gunluk))} gün, mühimmat ${Math.floor(C.muhimmat[c]! / 1000)}, piyade silahı ${w.ekip[c * 8]}`);
}
console.log(`Kronik (son 25):`);
for (const a of w.anlati.slice(-25)) console.log(`  ${tarihMetni(a.gun)} — ${a.metin}`);
// kayıt/yükleme yeniden oynatma denetimi
const b = serilestir(w);
const w2 = coz(b, pkg);
console.log(`Kayıt boyutu ${b.length} bayt; yeniden yükleme hash eşit: ${dunyaHash(w2) === dunyaHash(w)}`);
