// Harita v2 (şartname v1.6, PR-05): 463 → ≥788 bölge, eski bölgelerin korunması, senaryo mirası ve kayıt göçü (V16-T61).
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { coz, serilestir, dunyaHash, gunIlerle, kayitPaketi, type Paket } from '@ts/engine';

interface HBolge { ad: string; iso: string; ata: number; eski?: boolean; komsu: number[]; alanKm2: number }
const H = JSON.parse(readFileSync('data/derlenmis/harita.json', 'utf8')) as { v1: number; bolgeler: HBolge[]; kenarlar: { a: number; b: number; km: number }[] };
const V1 = JSON.parse(readFileSync('packages/data-compiler/src/veri/harita-v1.json', 'utf8')) as [string, string][];
const oku = (k: string) => JSON.parse(readFileSync(`data/derlenmis/${k}.json`, 'utf8')) as Paket;
const sahibi = (p: Paket, ad: string) => { const b = p.bolgeler.find((x) => x.ad === ad); if (!b) throw new Error(`bölge yok: ${ad}`); return p.ulkeler[b.sahip]!.kod; };

describe('V16-T61 harita v2: en az 788 bölge, eski bölgeler korunur', () => {
  test('bölge sayısı 463 × 1,70 = 787,1 → en az 788', () => {
    expect(V1.length).toBe(463);
    expect(H.v1).toBe(463);
    expect(H.bolgeler.length).toBeGreaterThanOrEqual(788);
  });
  test('her v1 bölgesi aynı ad ve ülkeyle tohum olarak sürer; adlar tekildir', () => {
    const tohum = H.bolgeler.filter((b) => b.eski);
    expect(tohum.length).toBe(463);
    for (const b of tohum) expect([b.ad, b.iso]).toEqual(V1[b.ata]);
    expect(new Set(tohum.map((b) => b.ata)).size).toBe(463);
    expect(new Set(H.bolgeler.map((b) => b.ad)).size).toBe(H.bolgeler.length);
    for (const b of H.bolgeler) { expect(b.ata).toBeGreaterThanOrEqual(0); expect(b.ata).toBeLessThan(463); expect(b.iso, b.ad).toBe(V1[b.ata]![1]); }
  });
  test('komşuluk simetrik, yalıtık bölge yok, bütün harita tek bileşen', () => {
    H.bolgeler.forEach((b, i) => {
      expect(b.komsu.length, b.ad).toBeGreaterThan(0);
      for (const v of b.komsu) expect(H.bolgeler[v]!.komsu, `${b.ad}–${H.bolgeler[v]!.ad}`).toContain(i);
    });
    const gor = new Uint8Array(H.bolgeler.length); const yig = [0]; gor[0] = 1; let n = 1;
    while (yig.length) { const x = yig.pop()!; for (const v of H.bolgeler[x]!.komsu) if (!gor[v]) { gor[v] = 1; n++; yig.push(v); } }
    expect(n).toBe(H.bolgeler.length);
    for (const k of H.kenarlar) { expect(k.a).not.toBe(k.b); expect(k.km).toBeGreaterThan(0); }
  });
  test('cephe coğrafyası ayrı bölgedir (1914/1939 harekât alanları)', () => {
    const ad = new Set(H.bolgeler.map((b) => b.ad));
    for (const a of ['Çanakkale', 'Gelibolu', 'Edirne', 'Kars', 'Batum', 'Verdun', 'Metz', 'Ypres', 'Liège', 'Koblenz', 'Łódź', 'Przemyśl', 'Brest-Litovsk', 'Trieste', 'Niş', 'Süveyş', 'Port Said', 'Tobruk', 'Dover', 'Okinava', 'Kudüs']) expect(ad.has(a), a).toBe(true);
  });
});

describe('V16-T61 senaryolar yeni haritada: miras ve tarihsel inceltme', () => {
  test('beş senaryo aynı bölge kümesini kullanır; göç eşlemesi pakettedir', () => {
    for (const k of ['s750', 's1600', 's1914', 's1939', 's2026']) {
      const p = oku(k);
      expect(p.bolgeler.length, k).toBe(H.bolgeler.length);
      expect(p.surum).toBe('3.0.0');
      expect(p.goc?.surum).toBe('2.0.0');
      expect(p.goc?.ata).toEqual(H.bolgeler.map((b) => b.ata));
      expect(p.goc?.tohum.reduce((s, x) => s + x, 0)).toBe(463);
      // açıkça atanmamış yeni bölge atasının sahibindedir
      const tohum: number[] = []; p.goc!.ata.forEach((a, r) => { if (p.goc!.tohum[r]) tohum[a] = r; });
      const farkli = p.bolgeler.filter((b, r) => b.sahip !== p.bolgeler[tohum[p.goc!.ata[r]!]!]!.sahip).length;
      expect(farkli, k).toBeLessThanOrEqual(24);
    }
  });
  test('1914: Kars Rusya, Trieste ve Przemyśl Avusturya-Macaristan, Nancy Fransa, Metz ve Qingdao Almanya', () => {
    const p = oku('s1914');
    expect(sahibi(p, 'Kars')).toBe('RUS');
    expect(sahibi(p, 'Trieste')).toBe('AUH');
    expect(sahibi(p, 'Przemyśl')).toBe('AUH');
    expect(sahibi(p, 'Nancy')).toBe('FRA');
    expect(sahibi(p, 'Metz')).toBe('GER');
    expect(sahibi(p, 'Qingdao')).toBe('GER');
    expect(sahibi(p, 'Çanakkale')).toBe('OSM');
    expect(sahibi(p, 'Port Arthur')).toBe('JAP');
  });
  test('1939: Wilno ve Brest-Litovsk Polonya, Memel Almanya, Litvanya başkenti Kaunas, Viipuri Finlandiya', () => {
    const p = oku('s1939');
    expect(sahibi(p, 'Wilno')).toBe('POL');
    expect(sahibi(p, 'Brest-Litovsk')).toBe('POL');
    expect(sahibi(p, 'Klaipėda')).toBe('GER');
    expect(sahibi(p, 'Wrocław')).toBe('GER');
    expect(sahibi(p, 'Vyborg')).toBe('FIN');
    const lit = p.ulkeler.find((u) => u.kod === 'LIT')!;
    expect(p.bolgeler[lit.baskent]!.ad).toBe('Kaunas');
  });
});

describe('V16-T61 kayıt göçü: harita v1 (463 bölge) kaydı yeni haritaya taşınır', () => {
  const bayt = new Uint8Array(gunzipSync(readFileSync('tests/corpus/s1914-harita-v1.tsk.gz')));
  const ozet = JSON.parse(readFileSync('tests/corpus/s1914-harita-v1.ozet.json', 'utf8')) as {
    gun: number; nR: number; nufus: number; birlik: number; proje: number; hazine: number[]; fabrika: number; gida: number; isgal: number; bolge: Record<string, [number, number, number, number]>;
  };
  const pkg = oku('s1914');
  const tohum: number[] = []; pkg.goc!.ata.forEach((a, r) => { if (pkg.goc!.tohum[r]) tohum[a] = r; });
  const aile: number[][] = Array.from({ length: 463 }, () => []); pkg.goc!.ata.forEach((a, r) => aile[a]!.push(r));

  test('fikstür eski paketle (2.0.0, 463 bölge) kaydedilmiştir', () => {
    expect(kayitPaketi(bayt)).toEqual({ kimlik: 's1914', surum: '2.0.0' });
    expect(ozet.nR).toBe(463);
    expect(ozet.isgal).toBeGreaterThan(0);
  });
  test('nüfus, hazine, fabrika, gıda, birlik ve proje toplamları tam korunur', () => {
    const w = coz(bayt, pkg);
    expect(w.nR).toBe(pkg.bolgeler.length);
    expect(w.gun).toBe(ozet.gun);
    let nufus = 0; for (let i = 0; i < w.pop.length; i++) nufus += w.pop[i]!;
    expect(nufus).toBe(ozet.nufus);
    expect(w.U.count()).toBe(ozet.birlik);
    expect(w.PR.count()).toBe(ozet.proje);
    expect(Array.from(w.C.c.hazine).slice(0, w.nC)).toEqual(ozet.hazine);
    let fab = 0, gida = 0;
    for (let r = 0; r < w.nR; r++) { fab += w.R.c.sivilF[r]! + w.R.c.askeriF[r]!; gida += w.E.c.gida[r]!; }
    expect(fab).toBe(ozet.fabrika);
    expect(gida).toBe(ozet.gida);
  });
  test('her eski bölge: mülkiyet ve kontrol alt bölümlere geçer, nüfus toplamı ve birlik konumu korunur', () => {
    const w = coz(bayt, pkg);
    let isgal = 0;
    Object.entries(ozet.bolge).forEach(([kod, [sahip, kontrol, nufus, birlik]]) => {
      const i = Number(kod.slice(1)) - 1;
      let n = 0;
      for (const r of aile[i]!) {
        expect(w.R.c.sahip[r], kod).toBe(sahip);
        expect(w.R.c.kontrolEden[r], kod).toBe(kontrol);
        for (let h = 0; h < 32; h++) n += w.pop[r * 32 + h]!;
        // kimlik dağılımı bölge nüfusuna eşit
        let km = 0; for (let q = 0; q < 7; q++) km += w.kim[r * 7 + q]!;
        expect(km, `${kod} kimlik`).toBe((() => { let s = 0; for (let h = 0; h < 32; h++) s += w.pop[r * 32 + h]!; return s; })());
      }
      expect(n, `${kod} nüfus`).toBe(nufus);
      let u = 0; for (const x of w.U.rows()) if (w.U.c.bolge[x] === tohum[i]) u++;
      expect(u, `${kod} birlik`).toBe(birlik);
      if (sahip !== kontrol) isgal++;
    });
    expect(isgal).toBe(ozet.isgal);
    // birlikler yalnız tohum bölgelerdedir (eski konumlarının aynı adlı devamı)
    for (const x of w.U.rows()) expect(pkg.goc!.tohum[w.U.c.bolge[x]!]).toBe(1);
  });
  test('göç belirlenimcidir; göç eden dünya 60 gün bütünlük hatasız ilerler ve kayıt-yükleme hash eşittir', () => {
    const a = coz(bayt, pkg), b = coz(bayt, pkg);
    expect(dunyaHash(a)).toBe(dunyaHash(b));
    for (let i = 0; i < 60; i++) gunIlerle(a, i === 59);
    const yeniden = coz(serilestir(a), pkg);
    expect(dunyaHash(yeniden)).toBe(dunyaHash(a));
    for (let i = 0; i < 60; i++) gunIlerle(b, i === 59);
    expect(dunyaHash(b)).toBe(dunyaHash(a));
  });
  test('başka senaryonun ya da bilinmeyen paket sürümünün kaydı göç ettirilmez', () => {
    expect(() => coz(bayt, oku('s1939'))).toThrow(/paket uyumsuz/);
    const sahte = { ...pkg, goc: { ...pkg.goc!, surum: '1.0.0' } };
    expect(() => coz(bayt, sahte)).toThrow(/paket uyumsuz/);
  });
});
