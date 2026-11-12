// v1.6 kabul testleri: Worker Promise, sürüm kilidi, aynı-gün idari emir, şehir yapı yuvası, istihbarat fonu (T21, T36–T40, T47).
import { describe, test, expect } from 'vitest';
import { BellekDepo } from '@ts/storage';
import { PROTOKOL_SURUM } from '@ts/protocol';
import { diplomasi, ortak, gelisim, A, dunyaHash, onizle, uygula, gunIlerle, arastirmaYuvalari, PROJE, type Emir } from '@ts/engine';
import { Sunucu } from '../../packages/worker/src/sunucu.ts';
import { Istemci } from '../../packages/ui/src/istemci.ts';
import { pkg, dunya } from './_ortak.ts';

function kur() {
  const giden: { id: number; t: string; p: any }[] = [];
  const s = new Sunucu(pkg, new BellekDepo(), (m) => giden.push({ id: m.id, t: m.t, p: m.p }));
  const iste = (id: number, t: string, p: unknown) => s.isle({ v: PROTOKOL_SURUM, id, t, p });
  const sonuc = (id: number) => giden.find((g) => g.id === id)!;
  return { s, giden, iste, sonuc };
}

/** Yalnız postMessage ve olay işleyicileri olan sahte Worker. */
class SahteWorker {
  gonderilen: any[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  postMessage(m: unknown) { this.gonderilen.push(m); }
}

describe('T36 Worker hata yanıtı bekleyen Promise\'i reddeder', () => {
  test('akışlı istek error alınca reddedilir ve bekleyenden silinir', async () => {
    const sw = new SahteWorker();
    const ist = new Istemci(sw as unknown as Worker);
    const akis: string[] = [];
    const p = ist.istek('advance', { birim: 'gun', adet: 3 }, (t) => akis.push(t), ['stopped']);
    const id = sw.gonderilen[0].id;
    sw.onmessage!({ data: { id, t: 'dayCommitted', p: {} } });
    sw.onmessage!({ data: { id, t: 'error', p: { kod: 'butunluk' } } });
    await expect(p).rejects.toMatchObject({ kod: 'butunluk' });
    expect(akis).toEqual(['dayCommitted']);
    expect((ist as any).bekleyen.size).toBe(0);
  });
  test('Worker çökerse bütün bekleyen istekler reddedilir', async () => {
    const sw = new SahteWorker();
    const ist = new Istemci(sw as unknown as Worker);
    const a = ist.istek('query', {}), b = ist.istek('advance', {}, () => {}, ['stopped']);
    sw.onerror!({ message: 'çöktü' });
    await expect(a).rejects.toMatchObject({ kod: 'worker' });
    await expect(b).rejects.toMatchObject({ kod: 'worker' });
    expect((ist as any).bekleyen.size).toBe(0);
  });
});

describe('T37 sürüm kilidi', () => {
  test('eski sürümle gönderilen emir reddedilir, kuyruk ve sürüm değişmez', async () => {
    const { s, iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    const w = s.dunya(), once = w.surum;
    await iste(2, 'submit', { tur: 'birlikKur', sablon: 0, adet: 1, beklenenSurum: once + 100 });
    expect(sonuc(2).p.kod).toBe('surum');
    expect(w.surum).toBe(once);
    expect(w.kuyruk.length).toBe(0);
  });
  test('başarılı anlık emir sürümü ve hash\'i yeniler; eski sürümle ikinci emir reddedilir', async () => {
    const { s, iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    const w = s.dunya(), once = w.surum;
    const h0 = dunyaHash(s.dunya());
    const t = Array.from({ length: 200 }, (_, i) => i).find((i) => onizle(w, { tur: 'arastir', ulke: 0, tek: i }).gecerli)!;
    await iste(2, 'submit', { tur: 'arastir', tek: t, beklenenSurum: once });
    expect(sonuc(2).p.sonuc[0]).toMatchObject({ kabul: true, aninda: true });
    expect(w.surum).toBe(once + 1);
    expect(dunyaHash(s.dunya())).not.toBe(h0);
    await iste(3, 'submit', { tur: 'vergi', oran: 210_000, beklenenSurum: once });
    expect(sonuc(3).p.kod).toBe('surum');
  });
});

describe('T38 teklif yanıtı gün ilerletmeden işlenir ve kaydedilir', () => {
  test('kabul aynı gün uygulanır, otomatik kayıt yazılır', async () => {
    const { s, iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 1, mod: 0 });
    const w = s.dunya(), gun = w.gun, surum = w.surum;
    // oyuncuyla henüz ticaret anlaşması olmayan bir devletten teklif
    const a = Array.from({ length: w.nC }, (_, i) => i).find((i) => i !== 1 && ortak.anlasmaVar(w, A.ticaret, i, 1) < 0 && ortak.anlasmaVar(w, A.ticaret, 1, i) < 0)!;
    const idx = diplomasi.teklifEkle(w, a, 1, diplomasi.TK.ticaret);
    expect(idx).toBeGreaterThanOrEqual(0);
    const tid = w.TK.id(idx);
    await iste(2, 'submit', { tur: 'teklifYanit', teklif: tid, kabul: 1, beklenenSurum: surum });
    const r = sonuc(2).p;
    expect(r.sonuc[0]).toMatchObject({ kabul: true, aninda: true });
    expect(r.anlik).toBe(1);
    expect(w.gun).toBe(gun);
    expect(w.surum).toBe(surum + 1);
    expect(w.TK.resolve(tid)).toBe(-1); // yanıtlanan teklif kapandı
    expect(Math.max(ortak.anlasmaVar(w, A.ticaret, a, 1), ortak.anlasmaVar(w, A.ticaret, 1, a))).toBeGreaterThanOrEqual(0);
    expect(w.kuyruk.length).toBe(0);
    expect((await s.kayit.yuvalar()).some((y) => y.yuva.startsWith('oto-'))).toBe(true);
  });
  test('ilerleme sürerken gelen emir meşgul hatası alır', async () => {
    const { s, iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    s.calisiyor = true;
    await iste(2, 'submit', { tur: 'vergi', oran: s.dunya().C.c.vergi[0]! + 10_000 });
    expect(sonuc(2)).toMatchObject({ t: 'error', p: { kod: 'mesgul' } });
    await iste(3, 'query', { gorunum: 'ozet' });
    expect(sonuc(3).t).toBe('view');
    s.calisiyor = false;
  });
});

describe('T39 inşa ve araştırma emri gün geçmeden listeye girer', () => {
  test('inşa projesi anında açılır; ilerleme yalnız zaman ilerleyince değişir', async () => {
    const { s, iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    const w = s.dunya(), gun = w.gun;
    const r = w.pkg.ulkeler[0]!.baskent;
    const p = PROJE.findIndex((_, i) => onizle(w, { tur: 'insa', ulke: 0, proje: i, bolge: r }).gecerli);
    expect(p).toBeGreaterThanOrEqual(0);
    const n0 = w.PR.list().length;
    await iste(2, 'submit', { tur: 'insa', proje: p, bolge: r });
    expect(sonuc(2).p.sonuc[0].aninda).toBe(true);
    expect(w.gun).toBe(gun);
    const yeni = w.PR.list().filter((x) => w.PR.c.ulke[x] === 0 && w.PR.c.tur[x] === p && w.PR.c.bolge[x] === r);
    expect(w.PR.list().length).toBe(n0 + 1);
    expect(yeni.length).toBeGreaterThan(0);
    const sp0 = w.PR.c.spKul[yeni.at(-1)!];
    expect(sp0).toBe(0);
    await iste(3, 'advance', { birim: 'gun', adet: 1, sessiz: [] });
    expect(w.gun).toBe(gun + 1);
  });
  test('araştırma seçimi anında yuvaya girer', async () => {
    const { s, iste } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    const w = s.dunya();
    const t = Array.from({ length: 200 }, (_, i) => i).find((i) => onizle(w, { tur: 'arastir', ulke: 0, tek: i }).gecerli)!;
    await iste(2, 'submit', { tur: 'arastir', tek: t });
    expect(w.kuyruk.length).toBe(0);
    const y = arastirmaYuvalari(w, 0);
    expect([...y.yuva, ...y.sirada]).toContain(t);
  });
  test('politika (vergi) anında, kaynak bağlayan emir (birlik kurma) kuyrukta', async () => {
    const { s, iste, sonuc } = kur();
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    const w = s.dunya();
    w.C.c.hazine[0] = 50_000_000;
    const oran = w.C.c.vergi[0]! >= 400_000 ? w.C.c.vergi[0]! - 10_000 : w.C.c.vergi[0]! + 10_000;
    await iste(2, 'submit', { tur: 'vergi', oran });
    expect(sonuc(2).p.sonuc[0]).toMatchObject({ kabul: true, aninda: true });
    expect(w.C.c.vergi[0]).toBe(oran);
    const bk = { tur: 'birlikKur', sablon: 0, adet: 1 };
    expect(onizle(w, { ...bk, ulke: 0 } as Emir).gecerli).toBe(true);
    await iste(3, 'submit', bk);
    expect(sonuc(3).p.sonuc[0]).toMatchObject({ kabul: true, aninda: false });
    expect(w.kuyruk.length).toBe(1);
  });
});

describe('T47 istihbarat hazineyi negatife düşüremez', () => {
  test('fon yetmezse önizleme reddeder ve stok değişmez', () => {
    const w = dunya(0, 0);
    const d = [1, 2, 3].find((x) => x < w.nC)!;
    w.C.c.pg[0] = 500_000;
    const emirler: Emir[] = [
      { tur: 'casusluk', ulke: 0, hedef: d }, { tur: 'suikast', ulke: 0, hedef: d },
      { tur: 'isyan', ulke: 0, hedef: d }, { tur: 'iliskiBozma', ulke: 0, hedef: 1, hedef2: 2 },
    ] as Emir[];
    for (const e of emirler) {
      w.C.c.hazine[0] = 5_000;
      expect(onizle(w, e).gecerli, e.tur).toBe(false);
      expect(uygula(w, e).ok, e.tur).toBe(false);
      expect(w.C.c.hazine[0], e.tur).toBe(5_000);
    }
  });
});

describe('T40 / T21 şehir yapı yuvası', () => {
  const kod = (k: string) => PROJE.findIndex((p) => p.kod === k);
  test('düzey 1 => 4, düzey 10 => 40 yuva; mevcut yapılar ve inşaattakiler yuva tüketir', () => {
    const w = dunya(0, 0);
    const r = w.pkg.ulkeler[0]!.baskent;
    w.R.c.kent[r] = 1;
    expect(gelisim.yapiYuvasi(w, r).kapasite).toBe(4);
    w.R.c.kent[r] = 10;
    expect(gelisim.yapiYuvasi(w, r).kapasite).toBe(40);
    const y = gelisim.yapiYuvasi(w, r);
    const R = w.R.c;
    expect(y.kullanilan).toBe(R.sivilF[r]! + R.askeriF[r]! + R.havaUs[r]! + R.tersane[r]! + R.maden[r]! + (R.valilik[r] ? 1 : 0));
  });
  test('yuva doluysa fabrika reddedilir; demiryolu, sulama, altyapı ve şehir imarı yuva tüketmez', () => {
    const w = dunya(0, 0);
    w.C.c.hazine[0] = 50_000_000;
    const r = w.pkg.ulkeler[0]!.baskent;
    const R = w.R.c;
    R.kent[r] = 2; R.sivilF[r] = 8; R.askeriF[r] = 0; R.havaUs[r] = 0; R.tersane[r] = 0; R.maden[r] = 0; R.valilik[r] = 0;
    R.demiryolu[r] = 0; R.sulama[r] = 0; R.altyapi[r] = 0;
    expect(gelisim.yapiYuvasi(w, r).bos).toBe(0);
    const k = onizle(w, { tur: 'insa', ulke: 0, proje: kod('sivil'), bolge: r });
    expect(k.gecerli).toBe(false);
    expect(k.neden).toMatch(/yuva/);
    for (const ag of ['demiryolu', 'sulama', 'altyapi', 'kent']) {
      const o = onizle(w, { tur: 'insa', ulke: 0, proje: kod(ag), bolge: r });
      if (!o.gecerli) expect(o.neden, ag).not.toMatch(/yapı yuvası/);
    }
    // bir yuva boşalınca fabrika kabul edilir; sürmekte olan inşaat da yuvayı tutar
    R.sivilF[r] = 7;
    expect(uygula(w, { tur: 'insa', ulke: 0, proje: kod('sivil'), bolge: r }).ok).toBe(true);
    expect(gelisim.yapiYuvasi(w, r)).toMatchObject({ insada: 1, bos: 0 });
    const o2 = onizle(w, { tur: 'insa', ulke: 0, proje: kod('askeri'), bolge: r });
    expect(o2.gecerli).toBe(false);
  });
  test('şehir imarı tamamlanınca düzey +1, 4 yuva açılır; fabrika bedelsiz oluşmaz ve ödeme yapılmadan düzey artmaz', () => {
    const w = dunya(0, 0);
    w.C.c.hazine[0] = 50_000_000;
    const r = w.pkg.ulkeler[0]!.baskent;
    w.R.c.kent[r] = Math.min(w.R.c.kent[r]!, 8);
    const k0 = w.R.c.kent[r]!, f0 = w.R.c.sivilF[r]! + w.R.c.askeriF[r]!, kap0 = gelisim.yapiYuvasi(w, r).kapasite;
    expect(uygula(w, { tur: 'insa', ulke: 0, proje: kod('kent'), bolge: r }).ok).toBe(true);
    const s = w.PR.list().find((x) => w.PR.c.tur[x] === kod('kent') && w.PR.c.bolge[x] === r)!;
    gunIlerle(w, false);
    expect(w.R.c.kent[r]).toBe(k0); // ödeme tamamlanmadan düzey artmaz
    w.PR.c.spKul[s] = w.PR.c.spTop[s]!; w.PR.c.nakitKul[s] = w.PR.c.nakitTop[s]!;
    for (let i = 0; i < 3 && w.PR.list().includes(s); i++) gunIlerle(w, false);
    expect(w.R.c.kent[r]).toBe(k0 + 1);
    expect(gelisim.yapiYuvasi(w, r).kapasite).toBe(kap0 + 4);
    expect(w.R.c.sivilF[r]! + w.R.c.askeriF[r]!).toBe(f0);
  });
  test('yeni oyunda hiçbir bölge mevcut yapılarıyla yuva sınırını aşmaz (düzey 10 altı)', () => {
    const w = dunya(0, 0);
    for (let r = 0; r < w.nR; r++) {
      const y = gelisim.yapiYuvasi(w, r);
      if (w.R.c.kent[r]! < 10) expect(y.kullanilan, w.pkg.bolgeler[r]!.ad).toBeLessThanOrEqual(y.kapasite);
    }
  });
});
