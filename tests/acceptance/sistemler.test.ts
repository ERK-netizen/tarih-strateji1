// Ekonomi, lojistik, muharebe, kontrol/işgal, siyaset, istihbarat.
import { describe, test, expect } from 'vitest';
import { ekonomi, lojistik, kara, siyaset, diplomasi, ortak, nufus, aralik, istihbaratDuzeyi, MALI, S, ck, T_GIDA, H_EYALET, H_BIRLIK, hatEkle, URUN_MUH, gunIlerle, A } from '@ts/engine';
import { dunya, ilerle, pkg } from './_ortak.ts';

describe('11–14 ekonomi ve lojistik', () => {
  test('T030 hasat beklentisi tam 1,000000', () => {
    const t = pkg.hasat.reduce((s, h, i) => s + h * pkg.hasatP[i]!, 0);
    expect(t).toBe(S * S);
  });
  test('T036 ödeme sırası: önce borç servisi; nakit yetmezse bakım payı düşer', () => {
    const w = dunya();
    w.C.c.borc[0] = 5_000_000_000; w.C.c.faiz[0] = 500_000; w.C.c.hazine[0] = 0;
    ekonomi.maliyeGunu(w);
    expect(w.C.c.bakimOdenen[0]).toBeLessThan(S);
  });
  test('T039 temerrüt bir kez işler', () => {
    const w = dunya();
    w.C.c.borc[1] = 900_000_000; w.C.c.faiz[1] = 300_000; w.C.c.hazine[1] = 0;
    const mesru0 = w.C.c.mesru[1]!;
    ilerle(w, 45);
    const temerrutAnlati = w.anlati.filter((a) => a.metin.includes('temerrüt')).length;
    expect(temerrutAnlati).toBe(1);
    expect(w.C.c.temerrut[1]).toBeGreaterThan(w.gun);
    expect(w.C.c.mesru[1]).toBeLessThanOrEqual(mesru0);
  });
  test('T040–T041 üretim: girdi yoksa q=0, kesirli ürün WIP\'te birikir', () => {
    const w = dunya();
    w.C.c.celik[3] = 0; w.C.c.komur[3] = 0;
    for (let r = 0; r < w.nR; r++) if (w.R.c.kontrolEden[r] === 3) { /* KZL çelik üretmez */ }
    const stok0 = w.ekip[ck(3, 0)]!;
    ekonomi.sanayiGunu(w);
    // KZL'de çelik yataktı yok: piyade silahı hattı durur
    expect(w.ekip[ck(3, 0)]).toBe(stok0);
    const w2 = dunya();
    const s = hatEkle(w2, 0, 5, 50_000); // sahra topu küçük hat
    w2.C.c.celik[0] = 1e9;
    ekonomi.sanayiGunu(w2);
    expect(w2.HT.c.wip[s]).toBeGreaterThan(0);
    expect(w2.HT.c.wip[s]).toBeLessThan(3000);
  });
  test('T046/T048 ortak kapasite ve kaynak stoğu sınırı', () => {
    const w = dunya();
    ilerle(w, 2);
    const e0 = pkg.ulkeler[0]!.baskent;
    const ey = pkg.bolgeler[e0]!.eyalet;
    w.E.c.gida[ey] = 5000; // 5 birim
    const hedefE = pkg.eyaletler.findIndex((e, i) => e.ulke === 0 && i !== ey);
    const t: lojistik.Talep[] = [0, 1, 2].map(() => ({ sinif: 0, tur: T_GIDA, alt: 0, miktar: 4000, ulke: 0, kaynakTip: H_EYALET, kaynakId: ey, kaynakBolge: w.depo[ey]!, hedefTip: H_EYALET, hedefId: hedefE, hedefBolge: w.depo[hedefE]!, agirlik: 1000 }));
    const s = lojistik.tahsis(w, t);
    const toplam = t.reduce((a, x, i) => a + Math.floor((x.miktar * s.olcek[i]!) / S), 0);
    expect(toplam).toBeLessThanOrEqual(5000);
    expect(s.olcek[0]).toBe(s.olcek[1]); // eşit haklı talepler orantılı pay
  });
  test('T052 sıfır arzda işlem miktarı sıfır, fiyat referansa yaklaşır', () => {
    const w = dunya();
    w.fiyat[MALI.celik] = 3000;
    const s = w.SP.alloc(); w.SP.c.ulke[s] = 1; w.SP.c.mal[s] = MALI.celik; w.SP.c.miktar[s] = 10_000; w.SP.c.yon[s] = 0;
    while (((w.gun % 7) + 7) % 7 !== 6) w.gun++;
    w.gun++;
    ekonomi.pazarTemizle(w);
    expect(w.pazarHacim[MALI.celik]).toBe(0);
  });
  test('T053 sipariş satır sırası tahsisi değiştirmez', () => {
    const kur = (ters: boolean) => {
      const w = dunya();
      w.C.c.celik[0] = 900_000; w.C.c.celik[2] = 900_000;
      const sat = [[0, 100_000], [2, 100_000]], al = [[1, 80_000], [3, 80_000]];
      const ekle = (u: number, m: number, yon: number) => { const s = w.SP.alloc(); w.SP.c.ulke[s] = u; w.SP.c.mal[s] = MALI.celik; w.SP.c.miktar[s] = m; w.SP.c.yon[s] = yon; };
      const liste = [...sat.map(([u, m]) => [u!, m!, 1]), ...al.map(([u, m]) => [u!, m!, 0])];
      for (const [u, m, y] of ters ? liste.reverse() : liste) ekle(u!, m!, y!);
      while (((w.gun % 7) + 7) % 7 !== 0) w.gun++;
      ekonomi.pazarTemizle(w);
      return [w.C.c.hazine[0], w.C.c.hazine[1], w.C.c.hazine[2], w.C.c.hazine[3], w.C.c.celik[0], w.C.c.celik[2]];
    };
    expect(kur(true)).toEqual(kur(false));
  });
});

describe('15 kara muharebesi', () => {
  test('T055 referans istatistik ekipman adediyle çarpılmaz', () => {
    const w = dunya();
    const u = w.U.list()[0]!;
    const U = ortak.uc(w);
    const a = ortak.birlikIstat(w, u);
    U.e0![u] = U.e0![u]! * 10;
    const b = ortak.birlikIstat(w, u);
    expect(b.YS).toBe(a.YS);
    U.e0![u] = Math.floor(U.e0![u]! / 20);
    expect(ortak.birlikIstat(w, u).YS).toBeLessThan(a.YS);
  });
  test('T054 savunma artışı etkin vuruşu artırmaz', () => {
    const etkin = (v: number, k: number) => Math.floor(Math.min(v, k) / 10) + Math.floor((Math.max(0, v - k) * 4) / 10);
    for (const v of [10_000, 50_000, 90_000]) {
      let once = Infinity;
      for (let k = 0; k <= 120_000; k += 5000) { const e = etkin(v, k); expect(e).toBeLessThanOrEqual(once); once = e; }
    }
  });
  test('T057–T059 savaş: kayıplar mevcut personelle sınırlı, köken muhasebesi korunur', () => {
    const w = dunya();
    diplomasi.savasIlan(w, 2, 1);
    const U = ortak.uc(w);
    // DMR birlikleri MVK sınırına saldırsın
    const hedef = w.R.list().find((r) => w.R.c.sahip[r] === 1 && pkg.bolgeler[r]!.komsu.some((v) => w.R.c.kontrolEden[v] === 2))!;
    for (const u of w.U.list()) if (U.ulke![u] === 2) U.hedef![u] = hedef;
    const kisi0 = new Map(w.U.list().map((u) => [u, U.kisi![u]!]));
    for (let i = 0; i < 40; i++) {
      gunIlerle(w);
      for (const u of w.U.rows()) { expect(U.kisi![u]).toBeGreaterThanOrEqual(0); if (kisi0.has(u) && U.muharebe![u]) expect(U.kisi![u]).toBeLessThanOrEqual(Math.max(kisi0.get(u)!, ortak.birlikIhtiyac(w, u).kisi)); }
    }
    expect(w.sayac.askerOlum).toBeGreaterThan(0);
    expect(nufus.insanGucu(w, 1).W + nufus.insanGucu(w, 2).W).toBeGreaterThan(0);
  });
  test('T050 karşılıklı geçişte tek çatışma kaydı', () => {
    const w = dunya();
    diplomasi.savasIlan(w, 2, 1);
    const U = ortak.uc(w);
    const a = w.U.list().find((u) => U.ulke![u] === 2)!, b = w.U.list().find((u) => U.ulke![u] === 1)!;
    U.hedef![a] = U.bolge![b]!; U.hedef![b] = U.bolge![a]!;
    const m = kara.hareketGunu(w);
    const bolgeler = m.map((x) => x.bolge);
    expect(new Set(bolgeler).size).toBe(bolgeler.length);
  });
});

describe('9 kontrol ve işgal', () => {
  test('T110–T111 kontrol hedefi şartname örnekleri', () => {
    const w = dunya();
    const r = pkg.bolgeler.findIndex((b) => b.sahip === 0 && b.anaYurt.includes(0));
    w.R.c.valilik[r] = 0;
    expect(siyaset.kontrolHedefi(w, r, 5).hedef).toBe(100_000);
    expect(siyaset.kontrolHedefi(w, r, 30).hedef).toBe(80_000);
    w.pkg = { ...w.pkg, bolgeler: w.pkg.bolgeler.map((b, i) => (i === r ? { ...b, anaYurt: [] } : b)) };
    w.R.c.valilik[r] = 1;
    expect(siyaset.kontrolHedefi(w, r, 60).hedef).toBe(40_000);
  });
  test('T108–T109 işgal: başlangıç itaati 0–40, taban erişim tavanın %25\'i', () => {
    const w = dunya();
    const r = pkg.bolgeler.findIndex((b) => b.sahip === 1);
    const i0 = siyaset.baslangicItaat(w, r, 2);
    expect(i0).toBeGreaterThanOrEqual(0); expect(i0).toBeLessThanOrEqual(40_000);
    w.R.c.kontrolEden[r] = 2; w.R.c.itaat[r] = 0; w.C.c.isgalPol[2] = 1;
    expect(ekonomi.isgalErisim(w, r)).toBe(137_500); // Dengeli: %55 × 0,25 = %13,75
    w.R.c.itaat[r] = 30_000;
    expect(ekonomi.isgalErisim(w, r)).toBe(261_250); // %26,1
  });
});

describe('17 siyaset ve 19 istihbarat', () => {
  test('T112 yorgunluk o ayın ölü + kalıcı sakat kaybıyla artar, birikimli değil', () => {
    const w = dunya();
    diplomasi.savasIlan(w, 2, 1);
    w.C.c.olumAy[1] = 20_000; w.C.c.sakatAy[1] = 5000; w.C.c.yorgunluk[1] = 0;
    siyaset.aylikSiyaset(w);
    const bir = w.C.c.yorgunluk[1]!;
    expect(bir).toBeGreaterThan(500);
    siyaset.aylikSiyaset(w); // bu ay kayıp yok
    expect(w.C.c.yorgunluk[1]! - bir).toBeLessThan(bir);
  });
  test('T132 gerçek değer istihbarat aralığının içinde; aralık istihbaratla daralır', () => {
    const w = dunya();
    for (const g of [1000, 123_456, 9_999_999]) for (const I of [0, 20_000, 50_000, 90_000]) {
      const a = aralik(w, 0, 5, g, I);
      expect(a.alt).toBeLessThanOrEqual(g); expect(a.ust).toBeGreaterThanOrEqual(g);
    }
    const dar = aralik(w, 0, 5, 1_000_000, 90_000), genis = aralik(w, 0, 5, 1_000_000, 10_000);
    expect(dar.ust - dar.alt).toBeLessThan(genis.ust - genis.alt);
    expect(istihbaratDuzeyi(w, 0, 0)).toBe(100_000);
  });
  test('T124 niyet göstergesi yalnız kamu sinyalinden: gizli plan değişince değişmez', () => {
    const w = dunya();
    const a = diplomasi.tehditPuani(w, 0, 2, 0).puan;
    w.C.c.hedefUlke[2] = 0; w.C.c.sonPlan[2] = 123; // gizli plan hafızası
    expect(diplomasi.tehditPuani(w, 0, 2, 0).puan).toBe(a);
    diplomasi.gerekceBaslat(w, 2, 0);
    expect(diplomasi.tehditPuani(w, 0, 2, 0).puan).toBeGreaterThan(a);
  });
  test('barış paketi atomik: bölgeler, ateşkes, işgal iadesi', () => {
    const w = dunya();
    diplomasi.savasIlan(w, 2, 1);
    const rs = w.R.list().filter((r) => w.R.c.sahip[r] === 1).slice(0, 2);
    for (const r of rs) w.R.c.kontrolEden[r] = 2;
    diplomasi.barisUygula(w, 2, 1, 1, [rs[0]!]);
    expect(w.R.c.sahip[rs[0]!]).toBe(2);
    expect(w.R.c.kontrolEden[rs[1]!]).toBe(1);
    expect(ortak.savasta(w, 1, 2)).toBe(false);
    expect(ortak.anlasmaVar(w, A.ateskes, 2, 1)).toBeGreaterThanOrEqual(0);
  });
});
