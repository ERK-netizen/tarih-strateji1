// v1.6 kabul testleri (ikinci grup): idempotency, kabul/kayıt ayrımı, çökme sonrası kurtarma, zaman adımları,
// iki rapor, sandbox sayı güvenliği, çağ dışı hava kuvveti, kayıt-yükleme-yeniden oynatma.
// (V16-T03, T08, T09, T56, T57, T58, T60, T63, T65, T68)
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { BellekDepo, type Depo } from '@ts/storage';
import { PROTOKOL_SURUM } from '@ts/protocol';
import { ayEkle, gunNo, tarih, dunyaHash, gunIlerle, senaryoBaslat, serilestir, coz, uygula, onizle, PROJE, type Paket, type Emir } from '@ts/engine';
import { Sunucu } from '../../packages/worker/src/sunucu.ts';
import { pkg, dunya } from './_ortak.ts';

function kur(depo: Depo = new BellekDepo()) {
  const giden: { id: number; t: string; p: any }[] = [];
  const s = new Sunucu(pkg, depo, (m) => giden.push({ id: m.id, t: m.t, p: m.p }));
  const iste = (id: number, t: string, p: unknown) => s.isle({ v: PROTOKOL_SURUM, id, t, p });
  const sonuc = (id: number) => giden.filter((g) => g.id === id).at(-1)!;
  return { s, giden, iste, sonuc, depo };
}
/** Durma olayları (savaş, olay kararı…) araya girse de hedef güne kadar ilerletir; ilk çağrının sonucunu döndürür. */
async function hedefe(x: ReturnType<typeof kur>, id: number, p: { birim: string; adet: number }, hedef: number) {
  await x.iste(id, 'advance', { ...p, sessiz: [] });
  const ilk = x.sonuc(id).p;
  for (let i = 1; x.s.dunya().gun < hedef && i < 400; i++) await x.iste(id * 1000 + i, 'advance', { birim: 'gun', adet: hedef - x.s.dunya().gun, sessiz: [] });
  return ilk;
}
const oku = (k: string) => JSON.parse(readFileSync(`data/derlenmis/${k}.json`, 'utf8')) as Paket;

describe('V16-T03 idempotency: aynı anahtar iki kez gelirse emir bir kez uygulanır', () => {
  test('çift dokunuş ikinci proje açmaz, ikinci kez kaynak ayırmaz; yanıt aynıdır', async () => {
    const { s, iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    const w = s.dunya();
    const r = w.pkg.ulkeler[0]!.baskent;
    const p = PROJE.findIndex((_, i) => onizle(w, { tur: 'insa', ulke: 0, proje: i, bolge: r }).gecerli);
    const emir = { tur: 'insa', proje: p, bolge: r, beklenenSurum: w.surum, idem: 'a1' };
    const n0 = w.PR.count();
    await iste(2, 'submit', emir);
    const surum = w.surum, hash = dunyaHash(w);
    await iste(3, 'submit', emir);
    expect(w.PR.count()).toBe(n0 + 1);
    expect(w.surum).toBe(surum);
    expect(dunyaHash(w)).toBe(hash);
    expect(sonuc(3).p.yinelenen).toBe(true);
    expect(sonuc(3).p.sonuc).toEqual(sonuc(2).p.sonuc);
    // farklı anahtar yeni emirdir
    await iste(4, 'submit', { ...emir, beklenenSurum: w.surum, idem: 'a2' });
    expect(w.PR.count()).toBe(n0 + 2);
  });
  test('kuyruklu emir de sürümü ilerletir; yineleme kuyruğa ikinci kez girmez', async () => {
    const { s, iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    const w = s.dunya(), once = w.surum;
    await iste(2, 'submit', { tur: 'birlikKur', sablon: 0, adet: 1, idem: 'k1' });
    await iste(3, 'submit', { tur: 'birlikKur', sablon: 0, adet: 1, idem: 'k1' });
    expect(w.kuyruk.length).toBe(1);
    expect(w.surum).toBe(once + 1);
    expect(sonuc(2).p.sonuc[0].aninda).toBe(false);
    // idem ve sürüm alanları kanonik kuyruğa sızmaz
    expect(Object.keys(w.kuyruk[0]!.emir)).not.toContain('idem');
    expect(Object.keys(w.kuyruk[0]!.emir)).not.toContain('beklenenSurum');
  });
});

describe('V16-T68 "kabul edildi" ile "kalıcı kaydedildi" ayrı bildirilir', () => {
  test('kayıt yazılınca kayit=true', async () => {
    const { s, iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    await iste(2, 'submit', { tur: 'vergi', oran: s.dunya().C.c.vergi[0]! + 10_000 });
    expect(sonuc(2).p.sonuc[0].kabul).toBe(true);
    expect(sonuc(2).p.kayit).toBe(true);
  });
  test('depolama yazamazsa emir geçerlidir ama kayit=false döner ve hata bildirilir', async () => {
    const bozuk: Depo = { oku: async () => null, yaz: async () => { throw new Error('disk dolu'); }, sil: async () => {}, liste: async () => [] };
    const { s, giden, iste, sonuc } = kur(bozuk);
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    const oran = s.dunya().C.c.vergi[0]! + 10_000;
    await iste(2, 'submit', { tur: 'vergi', oran });
    expect(sonuc(2).t).toBe('orderResult');
    expect(sonuc(2).p.sonuc[0]).toMatchObject({ kabul: true, aninda: true });
    expect(sonuc(2).p.kayit).toBe(false);
    expect(s.dunya().C.c.vergi[0]).toBe(oran);
    expect(giden.some((g) => g.t === 'error' && g.p.kod === 'kayit')).toBe(true);
  });
  test('reddedilen emirde kayıt denenmez (kayit=null)', async () => {
    const { iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    await iste(2, 'submit', { tur: 'insa', proje: 0, bolge: -5 });
    expect(sonuc(2).p.sonuc[0].kabul).toBe(false);
    expect(sonuc(2).p.kayit).toBeNull();
  });
});

describe('V16-T09 çökme sonrası kurtarma: otomatik kayıt son kesinleşmiş günü ve emri taşır', () => {
  test('yeni Worker aynı depodan açılınca gün, sürüm ve hash aynıdır', async () => {
    const depo = new BellekDepo();
    const a = kur(depo);
    await a.iste(1, 'init', { oyuncu: 0, mod: 0 });
    await a.iste(2, 'advance', { birim: 'gun', adet: 9, sessiz: ['proje', 'teklif', 'emir'] });
    await a.iste(3, 'submit', { tur: 'vergi', oran: a.s.dunya().C.c.vergi[0]! + 10_000 });
    const w = a.s.dunya();
    // "çökme": eski Sunucu bırakılır, depo kalır
    const b = kur(depo);
    await b.iste(1, 'load', { yuva: a.s.otoYuva() });
    expect(b.sonuc(1).t).toBe('ready');
    const y = b.s.dunya();
    expect(y.gun).toBe(w.gun);
    expect(y.surum).toBe(w.surum);
    expect(dunyaHash(y)).toBe(dunyaHash(w));
    expect(y.C.c.vergi[0]).toBe(w.C.c.vergi[0]);
  });
});

describe('V16-T57 takvim adımları: 1, 3 ve 6 ay takvim ayıdır', () => {
  test('ay sonu kırpılır, artık yıl hesaba katılır', () => {
    const g = (y: number, m: number, d: number) => gunNo({ y, m, d });
    expect(tarih(ayEkle(g(1914, 6, 28), 1))).toEqual({ y: 1914, m: 7, d: 28 });
    expect(tarih(ayEkle(g(1914, 6, 28), 3))).toEqual({ y: 1914, m: 9, d: 28 });
    expect(tarih(ayEkle(g(1914, 6, 28), 6))).toEqual({ y: 1914, m: 12, d: 28 });
    expect(tarih(ayEkle(g(1939, 8, 31), 6))).toEqual({ y: 1940, m: 2, d: 29 }); // 1940 artık yıl
    expect(tarih(ayEkle(g(1914, 8, 31), 6))).toEqual({ y: 1915, m: 2, d: 28 });
    expect(tarih(ayEkle(g(2026, 1, 31), 1))).toEqual({ y: 2026, m: 2, d: 28 });
    expect(tarih(ayEkle(g(1900, 1, 31), 1))).toEqual({ y: 1900, m: 2, d: 28 }); // 1900 artık değil
    expect(tarih(ayEkle(g(2000, 1, 31), 1))).toEqual({ y: 2000, m: 2, d: 29 });
    expect(ayEkle(g(1914, 6, 28), 6) - g(1914, 6, 28)).toBe(183);
  });
  test('Worker 3 ve 6 aylık adımda tam takvim gününe ilerler', async () => {
    const x = kur();
    await x.iste(1, 'init', { oyuncu: 0, mod: 2 });
    const bas = x.s.dunya().gun;
    // durma olmadan biten adım tam takvim gününde biter; durma olduysa kalan gün tamamlanır
    const a = await hedefe(x, 2, { birim: 'ay', adet: 3 }, ayEkle(bas, 3));
    if (a.neden === 'hedef') expect(a.gun).toBe(ayEkle(bas, 3));
    expect(x.s.dunya().gun).toBe(ayEkle(bas, 3));
    const orta = x.s.dunya().gun;
    const b = await hedefe(x, 3, { birim: 'ay', adet: 6 }, ayEkle(orta, 6));
    if (b.neden === 'hedef') expect(b.gun).toBe(ayEkle(orta, 6));
    expect(a.neden === 'hedef' || b.neden === 'hedef' || a.gecen > 0).toBe(true);
    expect(x.s.dunya().gun).toBe(ayEkle(orta, 6));
  });
});

describe('V16-T56 / T63 zaman adımı eşdeğerliği ve kayıt-yükleme-yeniden oynatma', () => {
  test('tek 180 günlük atlama ile 180 tek günlük adım aynı hash verir', async () => {
    const a = kur(), b = kur();
    await a.iste(1, 'init', { oyuncu: 0, mod: 2 });
    await b.iste(1, 'init', { oyuncu: 0, mod: 2 });
    const bas = a.s.dunya().gun;
    await hedefe(a, 2, { birim: 'gun', adet: 180 }, bas + 180);
    for (let i = 0; i < 180; i++) await b.iste(10 + i, 'advance', { birim: 'gun', adet: 1, sessiz: [] });
    expect(a.s.dunya().gun).toBe(bas + 180);
    expect(a.s.dunya().gun).toBe(b.s.dunya().gun);
    expect(dunyaHash(a.s.dunya())).toBe(dunyaHash(b.s.dunya()));
  });
  test('kayıt → yükleme → devam, kesintisiz koşuyla aynı hash verir (önbellek kapalıyken de)', () => {
    const a = dunya(0, 2), b = dunya(0, 2), c = dunya(0, 2);
    c.ayarlar.onbellekKapali = true;
    for (let i = 0; i < 90; i++) { gunIlerle(a, false); gunIlerle(c, false); }
    for (let i = 0; i < 45; i++) gunIlerle(b, false);
    const b2 = coz(serilestir(b), b.pkg);
    for (let i = 0; i < 45; i++) gunIlerle(b2, false);
    expect(dunyaHash(b2)).toBe(dunyaHash(a));
    expect(dunyaHash(c)).toBe(dunyaHash(a)); // V16-T64
  });
});

describe('V16-T58 iki rapor: Devletim ve Dünya Olayları ayrıdır', () => {
  test('tur raporunda her olay tarih taşır ve oyuncuya ait olup olmadığıyla işaretlidir', async () => {
    const { s, iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    await iste(2, 'advance', { birim: 'ay', adet: 6, sessiz: ['proje', 'teklif', 'emir', 'olay', 'savas', 'baris', 'gida', 'gerekce', 'teslim', 'temerrut', 'baskent'] });
    let r = sonuc(2).p;
    // durma olursa kalan süre tamamlanır
    for (let i = 0; i < 40 && r.neden !== 'hedef'; i++) { await iste(100 + i, 'advance', { birim: 'ay', adet: 1, sessiz: [] }); r = sonuc(100 + i).p; }
    const w = s.dunya();
    const olaylar = r.rapor.olaylar as { tarih: string; metin: string; onem: number; benim: boolean }[];
    for (const o of olaylar) { expect(typeof o.tarih).toBe('string'); expect(typeof o.benim).toBe('boolean'); }
    // Dünya sekmesi yalnız önemli (onem ≥ 2) yabancı olayları, Devletim oyuncunun olaylarını içerir
    for (const o of olaylar.filter((x) => !x.benim)) expect(o.onem).toBeGreaterThanOrEqual(2);
    const benimKronik = w.anlati.filter((a) => a.ulke === w.oyuncu).length;
    expect(benimKronik).toBeGreaterThan(0);
  });
});

describe('V16-T60 sandbox kanonik sayılara Infinity/NaN sokmaz', () => {
  test('sonsuz, NaN ve aşırı büyük miktarlar güvenli tamsayıda kalır; kayıt Sandbox etiketi alır', () => {
    const w = dunya(0, 0);
    const h0 = w.C.c.hazine[0]!;
    for (const miktar of [Infinity, -Infinity, NaN, 1e300, -1e300, 9e15]) {
      expect(uygula(w, { tur: 'sandbox', ulke: 0, alan: 'hazine', miktar } as Emir).ok).toBe(true);
      expect(Number.isSafeInteger(w.C.c.hazine[0]), String(miktar)).toBe(true);
      expect(w.C.c.hazine[0]).toBeGreaterThanOrEqual(0);
    }
    expect(w.mod).toBe(1);
    expect(h0).toBeGreaterThanOrEqual(0);
    for (const alan of ['gida', 'muhimmat', 'celik', 'komur', 'pg', 'huzur', 'ekip0']) uygula(w, { tur: 'sandbox', ulke: 0, alan, miktar: 1e300 } as Emir);
    for (let i = 0; i < 30; i++) gunIlerle(w, false); // bütünlük denetimi atmaz
    for (let c = 0; c < w.nC; c++) for (const k of ['hazine', 'pg', 'muhimmat', 'celik', 'komur', 'huzur'] as const) expect(Number.isSafeInteger(w.C.c[k][c]), `${k}[${c}]`).toBe(true);
    for (let i = 0; i < w.ekip.length; i++) expect(Number.isSafeInteger(w.ekip[i])).toBe(true);
  });
});

describe('V16-T65 750 ve 1600 senaryolarında çağ dışı hava kuvveti oluşmaz', () => {
  for (const k of ['s750', 's1600']) test(`${k}: 120 gün sonra uçak, hava üssü ve uçak siparişi yok`, () => {
    const p = oku(k);
    const w = senaryoBaslat(p, 0, 2);
    for (let i = 0; i < 120; i++) gunIlerle(w, false);
    for (let c = 0; c < w.nC; c++) expect(w.C.c.h0[c]! + w.C.c.h1[c]! + w.C.c.h2[c]!, p.ulkeler[c]!.kod).toBe(0);
    for (let r = 0; r < w.nR; r++) expect(w.R.c.havaUs[r]).toBe(0);
    const ucak = PROJE.findIndex((x) => x.kod === 'ucak'), us = PROJE.findIndex((x) => x.kod === 'havaus');
    for (const s of w.PR.rows()) { expect(w.PR.c.tur[s]).not.toBe(ucak); expect(w.PR.c.tur[s]).not.toBe(us); }
    expect(onizle(w, { tur: 'insa', ulke: 0, proje: us, bolge: p.ulkeler[0]!.baskent }).gecerli).toBe(false);
  });
});
