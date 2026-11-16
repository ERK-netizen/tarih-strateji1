// Çok maddeli barış antlaşması (şartname v1.6, PR-13): V16-T48, T49, T50.
import { describe, test, expect } from 'vitest';
import { diplomasi, ortak, onizle, uygula, gunIlerle, dunyaHash, A, teklifSonuc, type Emir, type World } from '@ts/engine';
import { ayristir, emirMetni } from '@ts/command';
import { katalogKur } from '../../packages/worker/src/katalog.ts';
import { dunya } from './_ortak.ts';

/** 0 ile komşusu D savaşta; D yenilmiş durumda (taviz bütçesi oluşsun). */
function kur(): { w: World; D: number; bolge: number[] } {
  const w = dunya(0, 0);
  const D = (() => { for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === 0) for (const v of w.komsuluk[r]!) if (w.R.c.sahip[v] !== 0) return w.R.c.sahip[v]!; throw new Error('komşu yok'); })();
  diplomasi.savasIlan(w, 0, D);
  for (const s of w.SV.rows()) w.SV.c.baslangic[s] = w.gun - 400; // savaş bir yılı aşkın sürüyor
  w.C.c.yorgunluk[D] = 90_000; w.C.c.huzur[D] = 20_000; w.C.c.g1[D] = 3_000_000;
  // D'nin başkent dışı iki bölgesi 0'ın işgalinde
  const bas = w.pkg.ulkeler[D]!.baskent;
  const bolge = Array.from({ length: w.nR }, (_, r) => r).filter((r) => w.R.c.sahip[r] === D && r !== bas).slice(0, 2);
  for (const r of bolge) w.R.c.kontrolEden[r] = 0;
  return { w, D, bolge };
}
const anl = (w: World, tur: number, a: number, b: number) => w.AN.list().filter((s) => w.AN.c.tur[s] === tur && w.AN.c.a[s] === a && w.AN.c.b[s] === b);

describe('V16-T49 toprak + tazminat + garanti aynı barış teklifinde', () => {
  test('üç madde birlikte önerilir, kabul edilince hepsi bir kez uygulanır', () => {
    const { w, D, bolge } = kur();
    const madde = { bolgeler: [bolge[0]!], tazminat: 600_000, taksitYil: 2, ateskesYil: 3, garanti: 1 };
    const emir = { tur: 'antlasma', ulke: 0, kime: D, ...madde } as Emir;
    const kart = onizle(w, emir);
    expect(kart.gecerli, kart.neden).toBe(true);
    expect(kart.bugun.join(' | ')).toMatch(/Toprak:.*Tazminat:.*Ateşkes: 3 yıl.*Garanti/);
    expect(diplomasi.antlasmaKabul(w, D, 0, madde).kabul, diplomasi.antlasmaKabul(w, D, 0, madde).neden).toBe(true);
    const gun = w.gun, gar0 = anl(w, A.garanti, 0, D).length;
    expect(uygula(w, emir).ok).toBe(true);
    // teklif aynı gün kayıtlıdır (dış taraf yanıtı ayrı)
    const s = w.TK.list().find((x) => w.TK.c.tur[x] === diplomasi.TK.antlasma)!;
    expect(w.TK.c.kimden[s]).toBe(0);
    expect(w.gun).toBe(gun);
    teklifSonuc(w, s, true);
    expect(ortak.savasta(w, 0, D)).toBe(false);
    expect(w.R.c.sahip[bolge[0]!]).toBe(0);
    expect(w.R.c.sahip[bolge[1]!]).toBe(D);           // istenmeyen bölge kalır
    expect(w.R.c.kontrolEden[bolge[1]!]).toBe(D);     // işgal iade edilir: kontrol ≠ mülkiyet (V16-T14)
    const taz = anl(w, A.tazminat, D, 0);
    expect(taz.length).toBe(1);
    expect(w.AN.c.miktar[taz[0]!]).toBe(Math.floor(600_000 / (2 * 365)));
    expect(w.AN.c.bitis[taz[0]!]).toBe(w.gun + 2 * 365);
    const at = w.AN.list().filter((x) => w.AN.c.tur[x] === A.ateskes && [w.AN.c.a[x], w.AN.c.b[x]].includes(0) && [w.AN.c.a[x], w.AN.c.b[x]].includes(D));
    expect(at.length).toBe(1);
    expect(w.AN.c.bitis[at[0]!]).toBe(w.gun + 3 * 365);
    expect(anl(w, A.garanti, 0, D).length).toBe(Math.max(1, gar0));
    // tazminat gerçek hazineden ödenir
    const h0 = w.C.c.hazine[0]!, hD = w.C.c.hazine[D]!;
    gunIlerle(w, false);
    expect(hD).toBeGreaterThan(0);
    expect(w.C.c.hazine[0]).not.toBe(h0);
  });
});

describe('V16-T48 atomiklik: geçersiz tek madde bütün taslağı reddeder', () => {
  test('başkent, yabancı toprak, yinelenen bölge, bozuk vade ya da boş taslak: hiçbir mutasyon yok', () => {
    const { w, D, bolge } = kur();
    const bas = w.pkg.ulkeler[D]!.baskent;
    const baska = Array.from({ length: w.nR }, (_, r) => r).find((r) => w.R.c.sahip[r] !== D && w.R.c.sahip[r] !== 0)!;
    const h = dunyaHash(w);
    const gecerli = { bolgeler: [bolge[0]!], tazminat: 500_000, taksitYil: 2, ateskesYil: 3, garanti: 0 };
    const bozuklar: Record<string, unknown>[] = [
      { ...gecerli, bolgeler: [bolge[0]!, bas] }, { ...gecerli, bolgeler: [bolge[0]!, baska] }, { ...gecerli, bolgeler: [bolge[0]!, bolge[0]!] },
      { ...gecerli, bolgeler: [bolge[0]!, 99_999] }, { ...gecerli, taksitYil: 0 }, { ...gecerli, taksitYil: 25 }, { ...gecerli, ateskesYil: 0 },
      { ...gecerli, tazminat: -5 }, { bolgeler: [], tazminat: 0, taksitYil: 5, ateskesYil: 5, garanti: 0 },
    ];
    for (const b of bozuklar) {
      const e = { tur: 'antlasma', ulke: 0, kime: D, ...b } as Emir;
      expect(onizle(w, e).gecerli, JSON.stringify(b)).toBe(false);
      expect(uygula(w, e).ok).toBe(false);
      expect(dunyaHash(w), JSON.stringify(b)).toBe(h);
    }
    // savaşta olunmayan devlete antlaşma önerilemez
    const diger = Array.from({ length: w.nC }, (_, c) => c).find((c) => c !== 0 && c !== D)!;
    expect(onizle(w, { tur: 'antlasma', ulke: 0, kime: diger, ...gecerli } as Emir).gecerli).toBe(false);
  });
  test('teklif beklerken koşul bozulursa (bölge el değiştirdi) kabulde hiçbir madde uygulanmaz', () => {
    const { w, D, bolge } = kur();
    const baska = Array.from({ length: w.nC }, (_, c) => c).find((c) => c !== 0 && c !== D)!;
    uygula(w, { tur: 'antlasma', ulke: 0, kime: D, bolgeler: [bolge[0]!, bolge[1]!], tazminat: 400_000, taksitYil: 2, ateskesYil: 3, garanti: 1 } as Emir);
    const s = w.TK.list().find((x) => w.TK.c.tur[x] === diplomasi.TK.antlasma)!;
    w.R.c.sahip[bolge[1]!] = baska; // ikinci bölge artık muhatabın değil
    const taz0 = anl(w, A.tazminat, D, 0).length, gar0 = anl(w, A.garanti, 0, D).length;
    teklifSonuc(w, s, true);
    expect(ortak.savasta(w, 0, D)).toBe(true);        // barış olmadı
    expect(w.R.c.sahip[bolge[0]!]).toBe(D);           // birinci bölge de devredilmedi
    expect(anl(w, A.tazminat, D, 0).length).toBe(taz0);
    expect(anl(w, A.garanti, 0, D).length).toBe(gar0);
    expect(w.TK.list().some((x) => w.TK.c.tur[x] === diplomasi.TK.antlasma)).toBe(false);
  });
  test('ödenemeyecek tazminat ve bütçeyi aşan istek reddedilir', () => {
    const { w, D, bolge } = kur();
    const tavan = diplomasi.tazminatTavani(w, D, 2);
    expect(diplomasi.antlasmaKabul(w, D, 0, { bolgeler: [], tazminat: tavan + 1, taksitYil: 2, ateskesYil: 3, garanti: 0 }).kabul).toBe(false);
    const hepsi = Array.from({ length: w.nR }, (_, r) => r).filter((r) => w.R.c.sahip[r] === D && r !== w.pkg.ulkeler[D]!.baskent);
    const y = diplomasi.antlasmaKabul(w, D, 0, { bolgeler: hepsi, tazminat: tavan, taksitYil: 2, ateskesYil: 3, garanti: 0 });
    if (!y.kabul) expect(y.neden).toMatch(/taviz|İsteklilik|Ayrı barış/);
    expect(bolge.length).toBeGreaterThan(0);
  });
});

describe('V16-T50 koalisyonda bir devletin barışı diğer savaşı bitirmez', () => {
  test('lider antlaşma imzalar; müttefikiyle savaş sürer', () => {
    const { w, D, bolge } = kur();
    const M = Array.from({ length: w.nC }, (_, c) => c).find((c) => c !== 0 && c !== D)!;
    const sv = w.SV.list()[0]!;
    diplomasi.savasaKatil(w, sv, M, ortak.tarafi(w, sv, D));
    expect(ortak.savasta(w, 0, M)).toBe(true);
    expect(diplomasi.antlasmaUygula(w, 0, D, { bolgeler: [bolge[0]!], tazminat: 0, taksitYil: 5, ateskesYil: 2, garanti: 0 })).toBe(true);
    expect(ortak.savasta(w, 0, D)).toBe(false);
    expect(ortak.savasta(w, 0, M)).toBe(true);
  });
});

describe('T123d antlaşma emrinin eşdeğer komutu aynı emre geri çözülür', () => {
  const { w, D, bolge } = kur();
  const k = katalogKur(w);
  const emirler: Record<string, unknown>[] = [
    { tur: 'antlasma', kime: D, bolgeler: [bolge[0]!], tazminat: 600000, taksitYil: 2, ateskesYil: 3, garanti: 1 },
    { tur: 'antlasma', kime: D, bolgeler: bolge, tazminat: 0, taksitYil: 5, ateskesYil: 5, garanti: 0 },
    { tur: 'antlasma', kime: D, bolgeler: [], tazminat: 250000, taksitYil: 4, ateskesYil: 1, garanti: 0 },
  ];
  for (const [i, e0] of emirler.entries()) test(`antlasma #${i}`, () => {
    const e = { ulke: 0, ...e0 } as { tur: string; ulke: number } & Record<string, unknown>;
    const m = emirMetni(e, k);
    const s = ayristir(m, k);
    const t = s.tur === 'emir' ? s.yorum.emir : s.tur === 'belirsiz' ? s.secenekler.find((x) => x.emir.tur === e.tur)?.emir : null;
    expect(t, `${m} → ${s.tur}${s.tur === 'ret' ? `: ${s.neden}` : ''}`).toBeTruthy();
    for (const key of Object.keys(e)) expect(t![key], `${m}: ${key}`).toEqual(e[key]);
  });
});
