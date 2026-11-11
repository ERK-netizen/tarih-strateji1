// Gelişime bağlı kapasiteler: şehir inşa yuvası, ülke birlik sınırı ve teknolojinin kara muharebesine etkisi.
// Hepsi kanonik durumdan türetilir (yeni sütun yok): kayıt şeması ve hash değişmez.
import type { World } from '../state/world.ts';
import { TEKNOLOJI, NTEK, AKTIF, tekVar, tekSeviye } from '../catalog.ts';
import { tarih } from '../calendar/index.ts';
import { siyasiKisiler, type SiyasiKisi } from '../siyasiKisiler.ts';
import { S, mulDiv } from '../num/index.ts';

export interface Bilesen { ad: string; deger: number }

// ---------- Şehir inşa yuvası ----------
/** Bir eyaletin eşzamanlı inşaat yuvası: altyapı, şehir düzeyi, valilik, sanayi ve inşaat tekniğiyle büyür. */
export function insaYuvasi(w: World, eyalet: number): { yuva: number; bilesen: Bilesen[] } {
  const bolgeler = w.pkg.eyaletler[eyalet]!.bolgeler;
  const R = w.R.c;
  let altyapi = 0, kentEn = 0, kentTop = 0, valilik = 0, fabrika = 0;
  for (const r of bolgeler) {
    altyapi += R.altyapi[r]!;
    kentEn = Math.max(kentEn, R.kent[r]!);
    kentTop += R.kent[r]!;
    if (R.valilik[r]) valilik = 1;
    fabrika += R.sivilF[r]! + R.askeriF[r]!;
  }
  const sahip = bolgeler.length > 0 ? R.sahip[bolgeler[0]!]! : -1;
  const b: Bilesen[] = [{ ad: 'Temel', deger: 1 }];
  b.push({ ad: 'Altyapı', deger: Math.floor(Math.floor(altyapi / Math.max(1, bolgeler.length)) / 2) });
  b.push({ ad: 'Şehir düzeyi', deger: Math.floor(kentEn / 2) + Math.floor(kentTop / 12) });
  b.push({ ad: 'Valilik', deger: valilik });
  b.push({ ad: 'Sanayi', deger: Math.floor(fabrika / 5) });
  if (sahip >= 0) b.push({ ad: 'İnşaat teknikleri', deger: (tekVar(w, sahip, 'insaat1') ? 1 : 0) + Math.floor(tekSeviye(w, sahip, 'insaat1') / 4) });
  const yuva = Math.min(24, b.reduce((s, x) => s + x.deger, 0));
  return { yuva, bilesen: b };
}

/** Eyalette sürmekte olan (gemi/uçak dışı) inşaat sayısı. */
export function insaSurenSayi(w: World, eyalet: number, ozel: (tur: number) => boolean): number {
  const eyBolge = w.pkg.eyaletler[eyalet]!.bolgeler;
  let n = 0;
  for (const s of w.PR.rows()) if (eyBolge.includes(w.PR.c.bolge[s]!) && !ozel(w.PR.c.tur[s]!)) n++;
  return n;
}

// ---------- Birlik sınırı ----------
/** Ülkenin taşıyabileceği birlik sayısı: yönetilen şehir, sanayi, nüfus, valilik ve idari teknolojiyle büyür. */
export function birlikSiniri(w: World, c: number): { sinir: number; bilesen: Bilesen[] } {
  const R = w.R.c;
  let bolge = 0, kent = 0, fabrika = 0, valilik = 0;
  for (let r = 0; r < w.nR; r++) {
    if (R.kontrolEden[r] !== c || R.sahip[r] !== c) continue;
    bolge++; kent += R.kent[r]!; fabrika += R.sivilF[r]! + R.askeriF[r]!;
    if (R.valilik[r]) valilik++;
  }
  const b: Bilesen[] = [{ ad: 'Temel kadro', deger: 20 }];
  b.push({ ad: 'Topraklar', deger: Math.floor(bolge / 4) });
  b.push({ ad: 'Şehirler', deger: Math.floor(kent / 4) });
  b.push({ ad: 'Sanayi', deger: Math.floor(fabrika / 4) });
  b.push({ ad: 'Valilikler', deger: Math.floor(valilik / 2) });
  b.push({ ad: 'Askerlik ve idare teknolojisi', deger: tekSeviye(w, c, 'kurmay') * 2 + tekSeviye(w, c, 'idare') * 2 + tekSeviye(w, c, 'sanayi1') });
  return { sinir: Math.max(40, Math.min(400, b.reduce((s, x) => s + x.deger, 0))), bilesen: b };
}

// ---------- Askerî teknoloji ----------
export interface AskTek { kara: number; doktrin: number; lojistik: number }
/** Kara kuvvetleri, doktrin ve lojistik hatlarında ulaşılmış kademelerin toplamı. */
export function askeriTek(w: World, c: number): AskTek {
  const t: AskTek = { kara: 0, doktrin: 0, lojistik: 0 };
  for (let i = 0; i < NTEK; i++) {
    const L = w.tekBitti[c * NTEK + i]!;
    if (L <= 0) continue;
    const dal = TEKNOLOJI[i]!.dal;
    if (dal === 0) t.kara += L; else if (dal === 1) t.doktrin += L; else if (dal === 2) t.lojistik += L;
  }
  return t;
}

export interface TekCarpan { saldiri: number; savunma: number; dayanim: number; kayip: number }
/**
 * Teknolojinin muharebe çarpanları (S ölçekli; 1 = etkisiz):
 * saldırı ve savunma güçlenir; dayanım (alınan örgüt hasarı) ile kayıp (can ve ekipman) azalır.
 */
export function tekCarpan(w: World, c: number): TekCarpan {
  const t = askeriTek(w, c);
  const sal = Math.min(450_000, t.kara * 6000) + Math.min(200_000, t.doktrin * 3000);
  const sav = Math.min(450_000, t.kara * 6000) + Math.min(200_000, t.doktrin * 3000);
  const day = Math.min(400_000, t.doktrin * 8000 + t.kara * 2000);
  const kay = Math.min(450_000, t.lojistik * 6000 + t.kara * 3000);
  const as = (liderAskerlik(w, c) - 5) * 5000;
  return { saldiri: S + sal + as, savunma: S + sav + as, dayanim: S - day, kayip: S - kay };
}
/** Kayıp oranına çarpan uygular. */
export const kayipUygula = (oran: number, carpan: number): number => mulDiv(oran, carpan, S).q;

// ---------- Siyasi kişilikler ----------
export interface KisiDurum extends SiyasiKisi { aktif: boolean; iktidarda: boolean; basta: boolean }
/** Ülkenin bugünkü siyasi kişilikleri; başta olan, iktidar partisine ve tarihe göre seçilir (ölü/göreve gelmemiş kişi başa geçmez). */
export function siyasiKisilik(w: World, c: number): { kisiler: KisiDurum[]; bas: KisiDurum | null } {
  const yil = tarih(w.gun).y;
  const kod = w.pkg.ulkeler[c]!.kod, ik = w.C.c.iktidar[c]!;
  const hepsi = siyasiKisiler(AKTIF.donem).filter((k) => k.kod === kod);
  const aktif = hepsi.filter((k) => k.bas <= yil && yil <= k.bit);
  let bas: SiyasiKisi | undefined = aktif.find((k) => k.rol === 0 && k.parti === ik) ?? aktif.find((k) => k.rol === 1 && k.parti === ik) ?? aktif.find((k) => k.rol === 0);
  if (bas && bas.parti !== ik && aktif.some((k) => k.parti === ik)) bas = aktif.find((k) => k.parti === ik)!;
  const kisiler = hepsi.map((k) => ({ ...k, aktif: aktif.includes(k), iktidarda: k.parti === ik && aktif.includes(k), basta: k === bas }));
  return { kisiler, bas: kisiler.find((k) => k.basta) ?? null };
}
/** Başta olan kişinin askerlik niteliği (1–10; kişi yoksa 5). */
export function liderAskerlik(w: World, c: number): number { return siyasiKisilik(w, c).bas?.askerlik ?? 5; }
/** Başta olan kişinin idare niteliğinin yönetim kapasitesine katkısı (puan ×1000). */
export function liderKapasite(w: World, c: number): number { return ((siyasiKisilik(w, c).bas?.idare ?? 5) - 5) * 1000; }
