// Bağımsız filolar ve hava kanatları (şartname v1.6, PR-08; şema 10): V16-T31–T35, T62 (9→10 göçü), T66 (çifte filo yok).
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { BellekDepo } from '@ts/storage';
import { PROTOKOL_SURUM } from '@ts/protocol';
import { kuvvet, deniz, us, diplomasi, onizle, uygula, gunIlerle, senaryoBaslat, serilestir, coz, dunyaHash, S, GEMI, HAVA, AKTIF, type Paket, type World } from '@ts/engine';
import { ayristir, emirMetni } from '@ts/command';
import { katalogKur } from '../../packages/worker/src/katalog.ts';
import { Sunucu } from '../../packages/worker/src/sunucu.ts';

const oku = (k: string) => JSON.parse(readFileSync(`data/derlenmis/${k}.json`, 'utf8')) as Paket;
const p14 = oku('s1914');
const ulke = (p: Paket, kod: string) => p.ulkeler.findIndex((u) => u.kod === kod);
const bolge = (p: Paket, ad: string) => { const i = p.bolgeler.findIndex((b) => b.ad === ad); if (i < 0) throw new Error(`bölge yok: ${ad}`); return i; };
const GER = ulke(p14, 'GER'), FRA = ulke(p14, 'FRA'), GBR = ulke(p14, 'GBR');
const emir = (w: World, e: Record<string, unknown>) => uygula(w, e as { tur: string; ulke: number });
const bak = (w: World, e: Record<string, unknown>) => onizle(w, e as { tur: string; ulke: number });
const yeni = () => senaryoBaslat(JSON.parse(JSON.stringify(p14)) as Paket, GER, 0);
const filolar = (w: World, c = GER) => kuvvet.ulkeFilolari(w, c);
const kanatlar = (w: World, c = GER) => kuvvet.ulkeKanatlari(w, c);
const gemiTop = (w: World, c: number) => [0, 1, 2, 3, 4].reduce((t, k) => t + deniz.gemiSay(w, c, k), 0);
const ucakTop = (w: World, c: number) => [0, 1, 2].reduce((t, k) => t + deniz.ucakSay(w, c, k), 0);
/** Ana limanın menzilinde, bulunduğu yere komşu olmayan, en az 3 sıçrama uzaktaki ilk kıyı bölgesi. */
const uzakKiyi = (w: World, f: number): number => {
  const F = w.FL.c;
  for (let r = 0; r < w.nR; r++) {
    if (!us.kiyidaMi(w, r)) continue;
    const d = kuvvet.sicrama(w, F.us[f]!, r, kuvvet.denizMenzili());
    if (d >= 3 && d <= kuvvet.denizMenzili()) return r;
  }
  throw new Error('uzak kıyı yok');
};

describe('PR-08 kuruluş: ülke toplamları filo ve kanatlara bölünür (ayna sütunlar)', () => {
  test('1914: her donanma en az bir filodur; toplamlar korunur; filolar kıyıda, kanatlar hava üssünde', () => {
    const w = yeni();
    expect(kuvvet.kuvvetDenetim(w)).toBeNull();
    for (let c = 0; c < w.nC; c++) {
      expect(filolar(w, c).length > 0, p14.ulkeler[c]!.kod).toBe(gemiTop(w, c) > 0);
      expect(kanatlar(w, c).length > 0, p14.ulkeler[c]!.kod).toBe(ucakTop(w, c) > 0);
      expect(filolar(w, c).length).toBeLessThanOrEqual(kuvvet.FILO_AZAMI);
      expect(kanatlar(w, c).length).toBeLessThanOrEqual(kuvvet.KANAT_AZAMI);
    }
    for (const f of w.FL.rows()) {
      const c = w.FL.c.ulke[f]!;
      expect(w.FL.c.konum[f]).toBe(w.FL.c.us[f]);
      expect(kuvvet.filoYolda(w, f)).toBe(false);
      if (kuvvet.limanlar(w, c).length) expect(us.kiyidaMi(w, w.FL.c.us[f]!), kuvvet.filoAdi(w, f)).toBe(true);
    }
    for (const k of w.KN.rows()) expect(w.R.c.havaUs[w.KN.c.us[k]!], kuvvet.kanatAdi(w, k)).toBeGreaterThan(0);
  });
  test('adlar ülke içinde tekil ve 1\'den başlar; ana donanma ana yurttadır; üs kapasitesi başlangıçta aşılmaz', () => {
    const w = yeni();
    for (const c of [GER, GBR, FRA]) {
      const ad = filolar(w, c).map((f) => kuvvet.filoAdi(w, f));
      expect(new Set(ad).size).toBe(ad.length);
      expect(ad).toContain('1. Filo');
      const kad = kanatlar(w, c).map((k) => kuvvet.kanatAdi(w, k));
      expect(new Set(kad).size).toBe(kad.length);
      expect(kad).toContain('1. Hava Kanadı');
      let ana = 0, dis = 0;
      for (const f of filolar(w, c)) { if (kuvvet.anaMi(w, c, w.FL.c.us[f]!)) ana += kuvvet.filoGemi(w, f); else dis += kuvvet.filoGemi(w, f); }
      expect(ana, p14.ulkeler[c]!.kod).toBeGreaterThan(dis);
    }
    for (const k of w.KN.rows()) { const d = kuvvet.usDoluluk(w, w.KN.c.us[k]!); expect(d.ucak, kuvvet.kanatAdi(w, k)).toBeLessThanOrEqual(d.kapasite); }
  });
  test('beş senaryoda kuruluş bütünlük denetiminden geçer; barut çağında kanat yoktur', () => {
    for (const k of ['s750', 's1600', 's1939', 's2026']) {
      const w = senaryoBaslat(oku(k), 0, 2);
      expect(kuvvet.kuvvetDenetim(w), k).toBeNull();
      expect(w.FL.count(), k).toBeGreaterThan(0);
      if (k === 's750' || k === 's1600') expect(w.KN.count(), k).toBe(0); else expect(w.KN.count(), k).toBeGreaterThan(0);
    }
  });
});

describe('V16-T31 aynı filo iki deniz bölgesinde eşzamanlı bulunamaz', () => {
  test('filo tek konumludur; yoldayken ne çıktığı ne varacağı bölgede etkilidir; varınca yalnız orada', () => {
    const w = yeni();
    const f = filolar(w)[0]!, F = w.FL.c, id = w.FL.id(f);
    const nereden = F.konum[f]!, hedef = uzakKiyi(w, f);
    expect(w.komsuluk[nereden]!.includes(hedef)).toBe(false);
    const o = bak(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 1, bolge: hedef });
    expect(o.gecerli, o.neden).toBe(true);
    const gun0 = w.gun;
    expect(emir(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 1, bolge: hedef }).ok).toBe(true);
    const sure = kuvvet.sicrama(w, nereden, hedef, 200) * kuvvet.SEYIR_GUN[AKTIF.donem]!;
    expect(F.varis[f]).toBe(gun0 + sure);
    expect(F.hedef[f]).toBe(hedef);
    expect(F.konum[f]).toBe(nereden); // tek konum sütunu: varana dek eski yerinde kayıtlı ama etkisiz
    expect(kuvvet.filoYolda(w, f)).toBe(true);
    // öteki filolar limanda (görev 0): kıyı desteği yalnız bu filodan gelebilir
    expect(deniz.kiyiDestek(w, GER, nereden)).toBe(0);
    expect(deniz.kiyiDestek(w, GER, hedef)).toBe(0);
    for (let i = 0; i < sure - 1; i++) gunIlerle(w, false);
    expect(kuvvet.filoYolda(w, f)).toBe(true);
    expect(deniz.kiyiDestek(w, GER, hedef)).toBe(0);
    gunIlerle(w, true);
    expect(kuvvet.filoYolda(w, f)).toBe(false);
    expect(F.konum[f]).toBe(hedef);
    expect(F.hedef[f]).toBe(-1);
    expect(deniz.kiyiDestek(w, GER, hedef)).toBeGreaterThan(0);
    expect(deniz.kiyiDestek(w, GER, nereden)).toBe(0);
    // etki alanı: bulunduğu bölge ve komşuları; başka hiçbir bölge değil
    let etkili = 0; for (let r = 0; r < w.nR; r++) if (deniz.kiyiDestek(w, GER, r) > 0) etkili++;
    expect(etkili).toBe(1 + w.komsuluk[hedef]!.length);
  });
  test('gemi tek filoya aittir: aktarım toplamı değiştirmez, boşalan filo silinir, yoldaki filoya aktarım olmaz', () => {
    const w = yeni();
    const [a, b] = filolar(w) as [number, number];
    const F = w.FL.c, top = gemiTop(w, GER), n0 = filolar(w).length;
    const ida = w.FL.id(a), idb = w.FL.id(b);
    // ayrı limanlardaki iki filo birleşemez
    expect(F.konum[a]).not.toBe(F.konum[b]);
    expect(bak(w, { tur: 'filoAktar', ulke: GER, filo: ida, hedefFilo: idb, sinif: 2, adet: 1 }).gecerli).toBe(false);
    // yeni filo: aynı bölgede kurulur
    const m0 = F.g2[a]!;
    expect(emir(w, { tur: 'filoAktar', ulke: GER, filo: ida, hedefFilo: -1, sinif: 2, adet: 5 }).ok).toBe(true);
    expect(filolar(w).length).toBe(n0 + 1);
    const y = filolar(w).find((x) => x !== a && F.konum[x] === F.konum[a] && kuvvet.filoGemi(w, x) === 5)!;
    expect(y).toBeDefined();
    expect(F.g2[a]).toBe(m0 - 5);
    expect(gemiTop(w, GER)).toBe(top);
    expect(kuvvet.kuvvetDenetim(w)).toBeNull();
    // olandan fazlası ve başka ülkenin filosu reddedilir
    expect(bak(w, { tur: 'filoAktar', ulke: GER, filo: w.FL.id(y), hedefFilo: ida, sinif: 2, adet: 6 }).gecerli).toBe(false);
    expect(bak(w, { tur: 'filoAktar', ulke: GER, filo: w.FL.id(filolar(w, GBR)[0]!), hedefFilo: -1, sinif: 2, adet: 1 }).gecerli).toBe(false);
    // geri birleştirme: boşalan filo tablodan çıkar
    expect(emir(w, { tur: 'filoAktar', ulke: GER, filo: w.FL.id(y), hedefFilo: ida, sinif: 2, adet: 5 }).ok).toBe(true);
    expect(filolar(w).length).toBe(n0);
    expect(F.g2[a]).toBe(m0);
    // yoldaki filoya aktarım yok
    emir(w, { tur: 'filoGorev', ulke: GER, filo: ida, gorev: 1, bolge: uzakKiyi(w, a) });
    expect(bak(w, { tur: 'filoAktar', ulke: GER, filo: ida, hedefFilo: -1, sinif: 2, adet: 1 }).gecerli).toBe(false);
    // filo sayısı sınırı
    while (filolar(w).length < kuvvet.FILO_AZAMI) expect(emir(w, { tur: 'filoAktar', ulke: GER, filo: idb, hedefFilo: -1, sinif: 2, adet: 1 }).ok).toBe(true);
    expect(bak(w, { tur: 'filoAktar', ulke: GER, filo: idb, hedefFilo: -1, sinif: 2, adet: 1 }).gecerli).toBe(false);
    expect(gemiTop(w, GER)).toBe(top);
    expect(kuvvet.kuvvetDenetim(w)).toBeNull();
  });
});

describe('V16-T32 / T33 hava kanadı: tek görev, tek hedef; menzil dışı katkı yok', () => {
  const kur = () => {
    const w = yeni();
    diplomasi.savasIlan(w, GER, FRA);
    const k = kanatlar(w).find((x) => w.KN.c.u0[x]! > 0 && w.KN.c.u1[x]! > 0)!;
    const usB = w.KN.c.us[k]!;
    // menzildeki iki ayrı hedef: birbirine komşu olmayan
    const yakin: number[] = [];
    for (let r = 0; r < w.nR && yakin.length < 2; r++) {
      const d = kuvvet.sicrama(w, usB, r, us.havaMenzili());
      if (d < 1 || d > us.havaMenzili()) continue;
      if (yakin.length === 1 && (r === yakin[0] || w.komsuluk[yakin[0]!]!.includes(r) || w.komsuluk[r]!.some((q) => w.komsuluk[yakin[0]!]!.includes(q)))) continue;
      yakin.push(r);
    }
    let uzak = -1;
    for (let r = 0; r < w.nR; r++) if (w.R.c.kontrolEden[r] === FRA && kuvvet.sicrama(w, usB, r, us.havaMenzili()) > us.havaMenzili()) { uzak = r; break; }
    return { w, k, id: w.KN.id(k), A: yakin[0]!, B: yakin[1]!, uzak };
  };
  const etkiAlani = (w: World) => { w.onbellek.delete('havaU'); const l: number[] = []; for (let r = 0; r < w.nR; r++) if (deniz.havaUstunluk(w, GER, r) !== 0) l.push(r); return l; };

  test('T32: kanat yalnız hedefinde ve komşularında sayılır; hedef değişince eski bölgeden tamamen çıkar', () => {
    const { w, id, k, A, B } = kur();
    expect(etkiAlani(w)).toEqual([]);
    expect(emir(w, { tur: 'kanatGorev', ulke: GER, kanat: id, gorev: 1, bolge: A }).ok).toBe(true);
    expect(etkiAlani(w).sort((x, y) => x - y)).toEqual([A, ...w.komsuluk[A]!].sort((x, y) => x - y));
    expect(deniz.havaUstunluk(w, GER, A)).toBe(S);
    expect(emir(w, { tur: 'kanatGorev', ulke: GER, kanat: id, gorev: 1, bolge: B }).ok).toBe(true);
    // emir önbelleği de tazeler: aynı gün içinde eski hedef artık sayılmaz
    expect(deniz.havaUstunluk(w, GER, A)).toBe(0);
    expect(deniz.havaUstunluk(w, GER, B)).toBe(S);
    expect(etkiAlani(w).sort((x, y) => x - y)).toEqual([B, ...w.komsuluk[B]!].sort((x, y) => x - y));
    expect(w.KN.c.hedef[k]).toBe(B);
  });
  test('T32: tek görev — üstünlük görevindeki kanat yakın destek vermez; destek görevine geçince verir', () => {
    const { w, id, A } = kur();
    emir(w, { tur: 'kanatGorev', ulke: GER, kanat: id, gorev: 1, bolge: A });
    expect(deniz.yakinDestek(w, GER, A)).toBe(0);
    emir(w, { tur: 'kanatGorev', ulke: GER, kanat: id, gorev: 2, bolge: A });
    expect(deniz.yakinDestek(w, GER, A)).toBeGreaterThan(0);
    // iki kanadın katkısı toplanır, tek kanat iki kez sayılmaz
    const tek = deniz.yakinDestek(w, GER, A);
    emir(w, { tur: 'kanatGorev', ulke: GER, kanat: id, gorev: 2, bolge: A });
    expect(deniz.yakinDestek(w, GER, A)).toBe(tek);
    emir(w, { tur: 'kanatGorev', ulke: GER, kanat: id, gorev: 0, bolge: -1 });
    expect(deniz.yakinDestek(w, GER, A)).toBe(0);
  });
  test('T33: menzil dışındaki hedef reddedilir ve hiçbir katkı vermez; yakın üsse geçince kabul edilir', () => {
    const { w, id, k, uzak } = kur();
    expect(uzak).toBeGreaterThanOrEqual(0);
    const o = bak(w, { tur: 'kanatGorev', ulke: GER, kanat: id, gorev: 1, bolge: uzak });
    expect(o.gecerli).toBe(false);
    expect(o.neden).toMatch(/menzil/);
    expect(emir(w, { tur: 'kanatGorev', ulke: GER, kanat: id, gorev: 1, bolge: uzak }).ok).toBe(false);
    expect(w.KN.c.gorev[k]).toBe(0);
    expect(etkiAlani(w)).toEqual([]);
    // menzil güvencesi: hedefi bir biçimde menzil dışına düşmüş kanat haftalık harekâtta üste kalır
    w.KN.c.gorev[k] = 1; w.KN.c.hedef[k] = uzak;
    deniz.havaHaftasi(w);
    expect(w.KN.c.gorev[k]).toBe(0);
    expect(w.KN.c.hedef[k]).toBe(-1);
    // hedefi menziline alan kendi üssü varsa kanat oraya aktarılır ve görev kabul edilir
    const usYakin = kuvvet.usler(w, GER).find((q) => kuvvet.sicrama(w, q, uzak, us.havaMenzili()) <= us.havaMenzili());
    if (usYakin !== undefined) {
      expect(emir(w, { tur: 'kanatUs', ulke: GER, kanat: id, bolge: usYakin }).ok).toBe(true);
      expect(w.KN.c.us[k]).toBe(usYakin);
      expect(w.KN.c.gorev[k]).toBe(0);
      expect(bak(w, { tur: 'kanatGorev', ulke: GER, kanat: id, gorev: 1, bolge: uzak }).gecerli).toBe(true);
    }
    // üs olmayan ya da başkasının bölgesi üs olamaz
    const ussuz = (() => { for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === GER && w.R.c.havaUs[r] === 0) return r; return -1; })();
    expect(bak(w, { tur: 'kanatUs', ulke: GER, kanat: id, bolge: ussuz }).gecerli).toBe(false);
    expect(bak(w, { tur: 'kanatUs', ulke: GER, kanat: id, bolge: w.pkg.ulkeler[FRA]!.baskent }).gecerli).toBe(false);
  });
  test('T33: genel hava emri yalnız hedefi kendi menzilinde olan kanatlara geçer', () => {
    const { w } = kur();
    const cephe = us.cepheler(w, GER).find((r) => w.R.c.kontrolEden[r] === GER && us.usMesafesi(w, GER, r) <= us.havaMenzili())!;
    expect(cephe).toBeDefined();
    expect(emir(w, { tur: 'havaGorev', ulke: GER, gorev: 1, bolge: cephe }).ok).toBe(true);
    let gorevli = 0;
    for (const k of kanatlar(w)) {
      const menzilde = kuvvet.kanatMenzilde(w, k, cephe);
      expect(w.KN.c.gorev[k]! > 0, kuvvet.kanatAdi(w, k)).toBe(menzilde);
      expect(w.KN.c.hedef[k]).toBe(menzilde ? cephe : -1);
      if (menzilde) gorevli++;
    }
    expect(gorevli).toBeGreaterThan(0);
  });
  test('üs kapasitesi aşılırsa kanadın gücü oranla düşer; uçak aktarımı toplamı korur', () => {
    const { w, k, id } = kur();
    const K = w.KN.c, usB = K.us[k]!;
    const g0 = deniz.kanatGucu(w, k, 'hava');
    const d0 = kuvvet.usDoluluk(w, usB);
    expect(d0.ucak).toBeLessThanOrEqual(d0.kapasite);
    w.R.c.havaUs[usB] = 1; // kapasite 24
    const d1 = kuvvet.usDoluluk(w, usB);
    expect(d1.ucak).toBeGreaterThan(d1.kapasite);
    expect(deniz.kanatGucu(w, k, 'hava')).toBe(Math.floor((g0 * d1.kapasite) / d1.ucak));
    w.R.c.havaUs[usB] = 5;
    const top = ucakTop(w, GER), n0 = kanatlar(w).length, a0 = K.u0[k]!;
    expect(emir(w, { tur: 'kanatAktar', ulke: GER, kanat: id, hedefKanat: -1, tip: 0, adet: 3 }).ok).toBe(true);
    expect(kanatlar(w).length).toBe(n0 + 1);
    expect(K.u0[k]).toBe(a0 - 3);
    const y = kanatlar(w).find((x) => x !== k && K.us[x] === usB && kuvvet.kanatUcak(w, x) === 3)!;
    expect(ucakTop(w, GER)).toBe(top);
    // başka üsteki kanada aktarım olmaz
    const baska = kanatlar(w).find((x) => K.us[x] !== usB)!;
    expect(bak(w, { tur: 'kanatAktar', ulke: GER, kanat: w.KN.id(y), hedefKanat: w.KN.id(baska), tip: 0, adet: 1 }).gecerli).toBe(false);
    expect(emir(w, { tur: 'kanatAktar', ulke: GER, kanat: w.KN.id(y), hedefKanat: id, tip: 0, adet: 3 }).ok).toBe(true);
    expect(kanatlar(w).length).toBe(n0);
    expect(K.u0[k]).toBe(a0);
    expect(kuvvet.kuvvetDenetim(w)).toBeNull();
  });
});

describe('V16-T34 deniz görevi liman, menzil, yakıt ve seyir süresi koşullarına uyar', () => {
  test('hedef kıyıda ve ana limanın menzilinde olmalı; petrolsüz filo denize açılamaz', () => {
    const w = yeni();
    const f = filolar(w)[0]!, id = w.FL.id(f), F = w.FL.c;
    const ic = (() => { for (let r = 0; r < w.nR; r++) if (!us.kiyidaMi(w, r)) return r; return -1; })();
    const o1 = bak(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 1, bolge: ic });
    expect(o1.gecerli).toBe(false);
    expect(o1.neden).toMatch(/kıyıda değil/);
    let uzak = -1;
    for (let r = 0; r < w.nR; r++) if (us.kiyidaMi(w, r) && kuvvet.sicrama(w, F.us[f]!, r, kuvvet.denizMenzili()) > kuvvet.denizMenzili()) { uzak = r; break; }
    expect(uzak).toBeGreaterThanOrEqual(0);
    const o2 = bak(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 2, bolge: uzak });
    expect(o2.gecerli).toBe(false);
    expect(o2.neden).toMatch(/menzil/);
    // yakıt
    const hedef = uzakKiyi(w, f);
    expect(bak(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 1, bolge: hedef }).gecerli).toBe(true);
    w.C.c.petrolIht[GER] = Math.max(1, w.C.c.petrolIht[GER]!); w.C.c.petrol[GER] = 0;
    const o3 = bak(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 1, bolge: hedef });
    expect(o3.gecerli).toBe(false);
    expect(o3.neden).toMatch(/[Yy]akıt/);
    // limana dönüş yakıtsız da serbesttir
    expect(bak(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 0, bolge: -1 }).gecerli).toBe(true);
    // başka devletin filosuna emir verilemez
    expect(bak(w, { tur: 'filoGorev', ulke: GER, filo: w.FL.id(filolar(w, GBR)[0]!), gorev: 1, bolge: hedef }).gecerli).toBe(false);
  });
  test('seyir süresi mesafeyle orantılıdır; limana dönüş ana limana seyirdir; ana limanda onarım hızlıdır', () => {
    const w = yeni();
    const f = filolar(w)[0]!, id = w.FL.id(f), F = w.FL.c, ana = F.us[f]!;
    const hedef = uzakKiyi(w, f);
    const d = kuvvet.sicrama(w, ana, hedef, 200), gun = kuvvet.SEYIR_GUN[AKTIF.donem]!;
    emir(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 2, bolge: hedef });
    expect(F.varis[f]! - w.gun).toBe(d * gun);
    w.gun = F.varis[f]!; kuvvet.kuvvetGunu(w);
    expect(F.konum[f]).toBe(hedef);
    // denizde onarım yavaş
    F.hasar[f] = 300_000;
    w.gun += 7; deniz.denizHaftasi(w);
    expect(F.hasar[f]).toBe(285_000);
    // limana dönüş: yolda onarım yavaş, limanda hızlı
    const g0 = w.gun;
    expect(emir(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 0, bolge: -1 }).ok).toBe(true);
    expect(F.hedef[f]).toBe(ana);
    expect(F.varis[f]! - g0).toBe(d * gun);
    expect(F.gorev[f]).toBe(0);
    w.gun = F.varis[f]!; kuvvet.kuvvetGunu(w);
    expect(F.konum[f]).toBe(ana);
    const h = F.hasar[f]!;
    w.gun += 7; deniz.denizHaftasi(w);
    expect(F.hasar[f]).toBe(Math.max(0, h - 60_000));
  });
  test('ana liman değişimi: menzil yeni limandan hesaplanır; intikal sürer ve görev sıfırlanır', () => {
    const w = yeni();
    const F = w.FL.c;
    // deniz aşırı istasyondaki filo: ana yurt kıyısı menzil dışında
    const dis = filolar(w).find((f) => !kuvvet.anaMi(w, GER, F.us[f]!))!;
    const ana = filolar(w).find((f) => kuvvet.anaMi(w, GER, F.us[f]!))!;
    expect(dis).toBeDefined();
    const id = w.FL.id(dis), liman = F.us[ana]!;
    const hedef = w.komsuluk[liman]!.find((r) => us.kiyidaMi(w, r)) ?? liman;
    expect(kuvvet.sicrama(w, F.us[dis]!, hedef, kuvvet.denizMenzili())).toBeGreaterThan(kuvvet.denizMenzili());
    expect(bak(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 1, bolge: hedef }).gecerli).toBe(false);
    // başkasının limanı ve iç bölge ana liman olamaz
    expect(bak(w, { tur: 'filoUs', ulke: GER, filo: id, bolge: w.pkg.ulkeler[GBR]!.baskent }).gecerli).toBe(false);
    expect(bak(w, { tur: 'filoUs', ulke: GER, filo: id, bolge: F.us[dis]! }).gecerli).toBe(false);
    F.gorev[dis] = 2;
    const g0 = w.gun, d = kuvvet.sicrama(w, F.konum[dis]!, liman, 200);
    expect(emir(w, { tur: 'filoUs', ulke: GER, filo: id, bolge: liman }).ok).toBe(true);
    expect(F.us[dis]).toBe(liman);
    expect(F.gorev[dis]).toBe(0);
    expect(F.varis[dis]! - g0).toBe(d * kuvvet.SEYIR_GUN.buyuk!);
    expect(kuvvet.filoYolda(w, dis)).toBe(true);
    w.gun = F.varis[dis]!; kuvvet.kuvvetGunu(w);
    expect(F.konum[dis]).toBe(liman);
    expect(bak(w, { tur: 'filoGorev', ulke: GER, filo: id, gorev: 1, bolge: hedef }).gecerli).toBe(true);
    // aynı limandaki iki filo artık birleşebilir
    expect(bak(w, { tur: 'filoAktar', ulke: GER, filo: id, hedefFilo: w.FL.id(ana), sinif: 2, adet: 1 }).gecerli).toBe(true);
  });
  test('yeni gemi kendi limanındaki filoya, yeni uçak yeri olan kanada katılır (toplamlar tablodan türer)', () => {
    const w = yeni();
    const f = filolar(w)[0]!, F = w.FL.c, top = gemiTop(w, GER), m = F.g2[f]!;
    kuvvet.gemiTeslim(w, GER, F.us[f]!, 2, 3);
    expect(F.g2[f]).toBe(m + 3);
    expect(gemiTop(w, GER)).toBe(top + 3);
    const u = ucakTop(w, GER);
    kuvvet.ucakTeslim(w, GER, 0, 10);
    expect(ucakTop(w, GER)).toBe(u + 10);
    expect(kuvvet.kuvvetDenetim(w)).toBeNull();
  });
});

describe('V16-T35 nakliye gemisi tek filoya aittir (ortak taşıma bütçesi PR-09 kapsamındadır)', () => {
  test('nakliye sınıfı filolar arasında bölünür; toplam ülke sütununa eşittir ve aktarımla değişmez', () => {
    const w = yeni();
    const F = w.FL.c;
    const top = () => filolar(w).reduce((t, f) => t + F.g4[f]!, 0);
    expect(top()).toBe(deniz.gemiSay(w, GER, 4));
    const f = filolar(w).find((x) => F.g4[x]! >= 2)!;
    const t0 = top();
    emir(w, { tur: 'filoAktar', ulke: GER, filo: w.FL.id(f), hedefFilo: -1, sinif: 4, adet: 2 });
    expect(top()).toBe(t0);
    expect(deniz.gemiSay(w, GER, 4)).toBe(t0);
  });
});

describe('V16-T62 / T66 kayıt: şema 10 gidiş-dönüş, eski kayıt göçü, uzun koşuda çifte filo yok', () => {
  test('yoldaki filo ve görevdeki kanat kayıttan aynı durumla ve aynı hash ile döner', () => {
    const w = yeni();
    diplomasi.savasIlan(w, GER, FRA);
    const f = filolar(w)[0]!, k = kanatlar(w)[0]!;
    emir(w, { tur: 'filoGorev', ulke: GER, filo: w.FL.id(f), gorev: 1, bolge: uzakKiyi(w, f) });
    const A = w.komsuluk[w.KN.c.us[k]!]![0]!;
    expect(emir(w, { tur: 'kanatGorev', ulke: GER, kanat: w.KN.id(k), gorev: 4, bolge: A }).ok).toBe(true);
    emir(w, { tur: 'filoAktar', ulke: GER, filo: w.FL.id(filolar(w)[1]!), hedefFilo: -1, sinif: 1, adet: 2 });
    for (let i = 0; i < 3; i++) gunIlerle(w, true);
    const y = coz(serilestir(w), p14);
    expect(dunyaHash(y)).toBe(dunyaHash(w));
    expect(y.FL.count()).toBe(w.FL.count());
    expect(filolar(y).map((x) => kuvvet.filoAdi(y, x))).toEqual(filolar(w).map((x) => kuvvet.filoAdi(w, x)));
    expect(y.FL.c.hedef[f]).toBe(w.FL.c.hedef[f]);
    expect(y.FL.c.varis[f]).toBe(w.FL.c.varis[f]);
    expect(y.KN.c.gorev[k]).toBe(4);
    expect(y.KN.c.hedef[k]).toBe(A);
    for (let i = 0; i < 10; i++) { gunIlerle(w, true); gunIlerle(y, true); }
    expect(dunyaHash(y)).toBe(dunyaHash(w));
  });
  test('şema ≤ 9 kaydı (harita v1 fikstürü): ülke toplamlarından filo ve kanat kurulur, toplamlar tam korunur', () => {
    const bayt = new Uint8Array(gunzipSync(readFileSync('tests/corpus/s1914-harita-v1.tsk.gz')));
    const w = coz(bayt, p14), w2 = coz(bayt, p14);
    expect(w.FL.count()).toBeGreaterThan(0);
    expect(w.KN.count()).toBeGreaterThan(0);
    expect(kuvvet.kuvvetDenetim(w)).toBeNull();
    expect(dunyaHash(w2)).toBe(dunyaHash(w));
    for (const f of w.FL.rows()) expect(w.R.c.kontrolEden[w.FL.c.us[f]!] === w.FL.c.ulke[f] || kuvvet.limanlar(w, w.FL.c.ulke[f]!).length === 0).toBe(true);
  });
  test('1939 gözlemci koşusu, 120 gün: bütünlük hatasız; karar modülü kanat ve filolara birim birim emir verir', () => {
    const p = oku('s1939');
    const w = senaryoBaslat(p, 2, 2);
    const G = ulke(p, 'GER');
    let gorevliKanat = 0, cephedeFilo = 0;
    for (let i = 0; i < 120; i++) {
      gunIlerle(w, i % 10 === 9);
      if (i % 7 === 6) {
        for (const k of kuvvet.ulkeKanatlari(w, G)) if (w.KN.c.gorev[k]! > 0) { gorevliKanat++; expect(kuvvet.kanatMenzilde(w, k, w.KN.c.hedef[k]!)).toBe(true); }
        for (const f of w.FL.rows()) if (w.FL.c.konum[f] !== w.FL.c.us[f] || kuvvet.filoYolda(w, f)) cephedeFilo++;
      }
    }
    expect(gorevliKanat).toBeGreaterThan(0);
    expect(cephedeFilo).toBeGreaterThan(0);
    expect(kuvvet.kuvvetDenetim(w)).toBeNull();
    // hiçbir filo iki yerde değil: konum tek sütun, gemi sayıları negatif değil, ayna toplamlar eşit (kuvvetDenetim)
    for (const f of w.FL.rows()) { expect(w.FL.c.konum[f]).toBeGreaterThanOrEqual(0); expect(w.FL.c.konum[f]).toBeLessThan(w.nR); }
  });
});

describe('T123 filo ve kanat emirleri: eşdeğer komut metni geri çözülür; emirler gün ilerletmez', () => {
  const w = yeni();
  diplomasi.savasIlan(w, GER, FRA);
  const k = katalogKur(w);
  const [f1, f2] = k.filolar!.map((x) => x.id) as [number, number];
  const [k1, k2] = k.kanatlar!.map((x) => x.id) as [number, number];
  const dover = bolge(p14, 'Dover'), metz = bolge(p14, 'Metz'), koln = bolge(p14, 'Köln'), hamburg = bolge(p14, 'Hamburg');
  const emirler: Record<string, unknown>[] = [
    { tur: 'filoGorev', filo: f1, gorev: 0, bolge: -1 }, { tur: 'filoGorev', filo: f2, gorev: 2, bolge: dover }, { tur: 'filoGorev', filo: f1, gorev: 1, bolge: -1 },
    { tur: 'filoGorev', filo: f1, gorev: 3, bolge: dover }, { tur: 'filoGorev', filo: f2, gorev: 4, bolge: -1 },
    { tur: 'filoUs', filo: f1, bolge: hamburg }, { tur: 'filoAktar', filo: f1, hedefFilo: -1, sinif: 2, adet: 3 }, { tur: 'filoAktar', filo: f1, hedefFilo: f2, sinif: 1, adet: 2 }, { tur: 'filoAktar', filo: f2, hedefFilo: f1, sinif: 0, adet: 1 },
    { tur: 'kanatGorev', kanat: k1, gorev: 0, bolge: -1 }, { tur: 'kanatGorev', kanat: k2, gorev: 1, bolge: metz }, { tur: 'kanatGorev', kanat: k1, gorev: 2, bolge: metz },
    { tur: 'kanatGorev', kanat: k1, gorev: 3, bolge: metz }, { tur: 'kanatGorev', kanat: k2, gorev: 4, bolge: metz },
    { tur: 'kanatUs', kanat: k1, bolge: koln },
    { tur: 'kanatAktar', kanat: k1, hedefKanat: -1, tip: 0, adet: 4 }, { tur: 'kanatAktar', kanat: k1, hedefKanat: k2, tip: 1, adet: 2 }, { tur: 'kanatAktar', kanat: k2, hedefKanat: k1, tip: 2, adet: 5 },
  ];
  for (const [i, e0] of emirler.entries()) test(`${String(e0.tur)} #${i}`, () => {
    const e = { ulke: GER, ...e0 } as { tur: string; ulke: number } & Record<string, unknown>;
    const m = emirMetni(e, k);
    expect(m).not.toContain('?');
    const s = ayristir(m, k);
    const t = s.tur === 'emir' ? s.yorum.emir : s.tur === 'belirsiz' ? s.secenekler.find((x) => x.emir.tur === e.tur)?.emir : null;
    expect(t, `${m} → ${s.tur}${s.tur === 'ret' ? `: ${s.neden}` : ''}`).toBeTruthy();
    for (const key of Object.keys(e)) expect(t![key], `${m}: ${key}`).toEqual(e[key]);
  });
  test('serbest Türkçe: "2. Filo Dover\'a gitsin", "1. Hava Kanadı\'nı Köln üssüne aktar"; eski genel komutlar sürer', () => {
    const a = ayristir(`${k.filolar![1]!.ad} Dover'a gitsin`, k);
    expect(a.tur === 'emir' && a.yorum.emir).toMatchObject({ tur: 'filoGorev', filo: f2, gorev: 1, bolge: dover });
    const b = ayristir(`${k.kanatlar![0]!.ad}'nı Köln üssüne aktar`, k);
    expect(b.tur === 'emir' && b.yorum.emir).toMatchObject({ tur: 'kanatUs', kanat: k1, bolge: koln });
    const c = ayristir('Donanma abluka görevine geçsin', k);
    expect(c.tur === 'emir' && c.yorum.emir).toMatchObject({ tur: 'donanmaGorev', gorev: 2 });
    const d = ayristir('2 filo avcı uçağı sipariş et', k);
    expect(d.tur === 'emir' && d.yorum.emir).toMatchObject({ tur: 'ucakUret', tip: 0, adet: 2 });
    const g = ayristir(`${k.filolar![0]!.ad} ne yapsın`, k);
    expect(g.tur).not.toBe('emir');
  });
  test('kataloglar: sınıf ve tür adları dönemin kataloğundandır', () => {
    expect(k.gemiler!.map((x) => x.ad)).toEqual(GEMI.buyuk.map((x) => x.ad));
    expect(k.ucaklar!.map((x) => x.ad)).toEqual(HAVA.buyuk.map((x) => x.ad));
    expect(k.filolar!.length).toBe(filolar(w).length);
    expect(k.kanatlar!.length).toBe(kanatlar(w).length);
  });
  test('sunucu: filo ve kanat emirleri anında uygulanır, gün ilerlemez; görünüm filo ve kanatları listeler', async () => {
    const giden: { id: number; t: string; p: any }[] = [];
    const s = new Sunucu(JSON.parse(JSON.stringify(p14)) as Paket, new BellekDepo(), (m) => giden.push({ id: m.id, t: m.t, p: m.p }));
    const iste = (id: number, t: string, p: unknown) => s.isle({ v: PROTOKOL_SURUM, id, t, p });
    await iste(1, 'init', { oyuncu: GER, mod: 0 });
    const ws = s.dunya(), gun = ws.gun;
    const f = filolar(ws)[0]!;
    await iste(2, 'submit', { tur: 'filoGorev', filo: ws.FL.id(f), gorev: 1, bolge: uzakKiyi(ws, f) });
    expect(giden.find((g) => g.id === 2)!.p.sonuc[0]).toMatchObject({ kabul: true, aninda: true });
    expect(ws.gun).toBe(gun);
    expect(kuvvet.filoYolda(ws, f)).toBe(true);
    await iste(3, 'query', { gorunum: 'kuvvet' });
    const g = giden.find((x) => x.id === 3)!.p.veri;
    expect(g.filolar.length).toBe(filolar(ws).length);
    expect(g.kanatlar.length).toBe(kanatlar(ws).length);
    expect(g.filolar[0].hedefAd).toBeTruthy();
    expect(g.filolar[0].kalan).toBeGreaterThan(0);
    expect(g.denizMenzil).toBe(kuvvet.DENIZ_MENZIL.buyuk);
  });
});
