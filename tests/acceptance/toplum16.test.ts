// İstihbarat raporu, halk dökümü ve iskân (şartname v1.6, PR-12 ve PR-06): V16-T16, T17, T18, T21, T22, T46.
import { describe, test, expect } from 'vitest';
import { istihbaratRaporu, raporlar, istihbaratAy, RAPOR_OMUR, ISTIHBARAT_KONU, toplum, onizle, uygula, gunIlerle, serilestir, coz, dunyaHash, NKIMLIK, type Emir, type World } from '@ts/engine';
import * as G from '../../packages/worker/src/gorunum.ts';
import { dunya } from './_ortak.ts';

const nufus = (w: World) => { let n = 0; for (let i = 0; i < w.pop.length; i++) n += w.pop[i]!; return n; };

describe('V16-T46 istihbarat raporu gözlem günü ve güven aralığı taşır', () => {
  test('ajan raporu: gerçek değer aralığın içinde, kesin değer raporda yok, gözlem günü ve güven kayıtlı', () => {
    const w = dunya(0, 0);
    w.C.c.pg[0] = 500_000; w.C.c.hazine[0] = 10_000_000;
    const d = 2;
    const rs = istihbaratRaporu(w, 0, d);
    expect(rs.length).toBe(ISTIHBARAT_KONU.length);
    let birlik = 0, kisi = 0; for (const u of w.U.rows()) if (w.U.c.ulke[u] === d) { birlik++; kisi += w.U.c.kisi[u]!; }
    const gercek = [w.C.c.hazine[d]!, birlik, kisi, w.C.c.huzur[d]!, w.C.c.mesru[d]!];
    const R = w.IR.c;
    rs.forEach((s, i) => {
      expect(R.konu[s]).toBe(i);
      expect(R.gozlem[s]).toBe(w.gun);
      expect(R.bitis[s]).toBe(w.gun + RAPOR_OMUR);
      expect(R.alt[s]).toBeLessThanOrEqual(gercek[i]!);
      expect(R.ust[s]).toBeGreaterThanOrEqual(gercek[i]!);
      expect(R.guven[s]).toBeGreaterThan(500_000);
      expect(R.guven[s]).toBeLessThan(1_000_000);
    });
    // büyük değerlerde aralık gerçekten bir aralıktır (nokta değil)
    expect(R.ust[rs[0]!]).toBeGreaterThan(R.alt[rs[0]!]!);
    expect(R.ust[rs[2]!]).toBeGreaterThan(R.alt[rs[2]!]!);
  });
  test('casusluk emri anlatıya kesin hazineyi yazmaz; yeni rapor eskisinin yerini alır; süresi dolan silinir', () => {
    const w = dunya(0, 0);
    w.C.c.pg[0] = 5_000_000; w.C.c.hazine[0] = 100_000_000;
    const d = 2;
    for (let i = 0; i < 12 && raporlar(w, 0, d).length === 0; i++) { uygula(w, { tur: 'casusluk', ulke: 0, hedef: d } as Emir); gunIlerle(w, false); }
    const ilk = raporlar(w, 0, d);
    expect(ilk.length).toBe(ISTIHBARAT_KONU.length);
    const metin = w.anlati.filter((a) => /İstihbarat raporu/.test(a.metin)).at(-1)!.metin;
    expect(metin).toMatch(/güven %\d+/);
    expect(metin).toMatch(/hazine [\d.]+–[\d.]+/);
    // görünüm: yalnız aralık, gözlem tarihi ve yaş
    const g = (G.diplomasiG(w) as any).ulkeler.find((u: any) => u.id === d);
    expect(g.rapor.length).toBe(ISTIHBARAT_KONU.length);
    expect(Object.keys(g.rapor[0]).sort()).toEqual(['alt', 'gozlem', 'guven', 'k', 'konu', 'ust', 'yas']);
    // yinelenen rapor tabloyu büyütmez
    const say = w.IR.count();
    istihbaratRaporu(w, 0, d);
    expect(w.IR.count()).toBe(say);
    // kayıt-yükleme raporları korur
    const y = coz(serilestir(w), w.pkg);
    expect(dunyaHash(y)).toBe(dunyaHash(w));
    expect(raporlar(y, 0, d).length).toBe(ISTIHBARAT_KONU.length);
    // süresi dolunca silinir
    w.gun += RAPOR_OMUR + 1;
    expect(raporlar(w, 0, d).length).toBe(0);
    istihbaratAy(w);
    expect(w.IR.count()).toBe(0);
  });
});

describe('V16-T21 / T22 halk dökümü: küçük azınlık ayrı görünür, alt toplamlar nüfusa eşit', () => {
  test('%0,01 büyüklüğündeki topluluk ayrı satırdır ve payı doğrudur', () => {
    const w = dunya(0, 0);
    // bir bölgede "ikinci" kimlik hücresine nüfusun on binde biri kadar kişi taşınır (nüfus değişmez)
    const once = G.halklar(w, 0);
    const r = Array.from({ length: w.nR }, (_, x) => x).find((x) => w.R.c.sahip[x] === 0 && w.pkg.bolgeler[x]!.kimlikAnahtar[1]![0] >= 0 && w.kim[x * NKIMLIK + 1]! === 0 && w.kim[x * NKIMLIK]! > once.toplam / 5000)
      ?? Array.from({ length: w.nR }, (_, x) => x).find((x) => w.R.c.sahip[x] === 0 && w.kim[x * NKIMLIK + 1]! > 0)!;
    const kucuk = Math.max(1, Math.floor(once.toplam / 10_000));
    if (w.kim[r * NKIMLIK + 1]! === 0) { w.kim[r * NKIMLIK] = w.kim[r * NKIMLIK]! - kucuk; w.kim[r * NKIMLIK + 1] = kucuk; }
    const h = G.halklar(w, 0);
    const ad = toplum.kimlikAdi(w, r, 1);
    const satir = h.liste.find((x) => x.ad === ad)!;
    expect(satir).toBeTruthy();
    expect(satir.kisi).toBeGreaterThan(0);
    expect(satir.ppm).toBe(Math.floor((satir.kisi * 1_000_000) / h.toplam));
    expect(h.toplam).toBe(once.toplam);
  });
  test('kimlik alt toplamları = bölge nüfusları toplamı = ülke nüfusu; 120 gün sonra da', () => {
    const w = dunya(0, 2);
    const denetle = () => {
      for (let c = 0; c < w.nC; c++) {
        const h = G.halklar(w, c);
        let n = 0; for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c) for (let k = 0; k < 32; k++) n += w.pop[r * 32 + k]!;
        expect(h.liste.reduce((s, x) => s + x.kisi, 0)).toBe(h.toplam);
        // kimlik muhasebesi sivil değişimlerde nüfusa eşitlenir; askerî statü farkı binde beşi aşmaz
        expect(Math.abs(h.toplam - n)).toBeLessThanOrEqual(Math.ceil(n / 200));
        expect(h.liste.reduce((s, x) => s + x.ppm, 0)).toBeLessThanOrEqual(1_000_000);
      }
    };
    denetle();
    for (let i = 0; i < 120; i++) gunIlerle(w, false);
    denetle();
  });
});

describe('V16-T16 / T17 / T18 iskân: yoktan insan yok, hedefte aynı kültür şart değil, göç korunumlu', () => {
  test('hedef bölgede devletin kültürü kayıtlı olmasa da iskân kabul edilir ve yerleşimciler korunumla taşınır', () => {
    const w = dunya(0, 0);
    w.C.c.hazine[0] = 100_000_000;
    const U = w.pkg.ulkeler[0]!;
    // devletin kültürünün kimlik kaydı olmayan kendi bölgesi (yoksa kayıt geçici olarak kaldırılır)
    let r = Array.from({ length: w.nR }, (_, x) => x).find((x) => w.R.c.sahip[x] === 0 && w.R.c.kontrolEden[x] === 0 && x !== U.baskent && toplum.kimlikHucresi(w, x, U.kultur) < 0);
    if (r === undefined) {
      r = Array.from({ length: w.nR }, (_, x) => x).find((x) => w.R.c.sahip[x] === 0 && x !== U.baskent)!;
      const a = w.pkg.bolgeler[r]!.kimlikAnahtar;
      const k = toplum.kimlikHucresi(w, r, U.kultur);
      const diger = toplum.digerHucre(w, r);
      w.kim[r * NKIMLIK + diger] = w.kim[r * NKIMLIK + diger]! + w.kim[r * NKIMLIK + k]!; w.kim[r * NKIMLIK + k] = 0;
      a[k] = [-1, -1];
    }
    expect(toplum.kimlikHucresi(w, r, U.kultur)).toBe(-1);
    const emir = { tur: 'demografi', ulke: 0, bolge: r, eylem: 2, kimlik: 0 } as Emir;
    const kart = onizle(w, emir);
    expect(kart.gecerli, kart.neden).toBe(true);
    expect(uygula(w, emir).ok).toBe(true);
    const bolgeN = (x: number) => { let n = 0; for (let k = 0; k < 32; k++) n += w.pop[x * 32 + k]!; return n; };
    const top0 = nufus(w), hedef0 = bolgeN(r), kaynak0 = bolgeN(U.baskent);
    toplum.demografiHaftasi(w);
    // hedefteki artış = kaynaktaki azalış; toplam nüfus aynı
    expect(nufus(w)).toBe(top0);
    expect(bolgeN(r) - hedef0).toBeGreaterThan(0);
    expect(bolgeN(r) - hedef0).toBe(kaynak0 - bolgeN(U.baskent));
  });
  test('kaynakta yerleşimci verecek nüfus yoksa iskân reddedilir (yoktan insan yaratılmaz)', () => {
    const w = dunya(0, 0);
    const U = w.pkg.ulkeler[0]!;
    const r = Array.from({ length: w.nR }, (_, x) => x).find((x) => w.R.c.sahip[x] === 0 && w.R.c.kontrolEden[x] === 0 && x !== U.baskent)!;
    const k = toplum.kimlikHucresi(w, U.baskent, U.kultur);
    const diger = toplum.digerHucre(w, U.baskent);
    w.kim[U.baskent * NKIMLIK + diger] = w.kim[U.baskent * NKIMLIK + diger]! + w.kim[U.baskent * NKIMLIK + k]!; w.kim[U.baskent * NKIMLIK + k] = 0;
    const n0 = nufus(w);
    const kart = onizle(w, { tur: 'demografi', ulke: 0, bolge: r, eylem: 2, kimlik: 0 } as Emir);
    expect(kart.gecerli).toBe(false);
    expect(kart.neden).toMatch(/nüfus yok/);
    expect(nufus(w)).toBe(n0);
  });
});
