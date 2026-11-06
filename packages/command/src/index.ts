// Bölüm 20: Türkçe komut sistemi. Kapalı katalog + plan şablonu + önizleme; sınırsız serbest dil anlama iddiası yoktur.
// Saf fonksiyon: yalnız katalog ve görünür varlık adlarını okur. Doğrulama ve bedel Worker'dadır.
import { sozcukler, katla, kipCoz, halCoz, ekle, type Token, type Hal, type KipSonuc } from './turkce.ts';
export { ekle, katla, kucuk } from './turkce.ts';

export interface KatalogBirlik { id: number; ad: string; bolge: number; sablon: number; hedef: number }
export interface Katalog {
  oyuncu: number;
  ulkeler: { kod: string; ad: string; kisa: string; sifat: string }[];
  bolgeler: { ad: string; kontrol: number; sahip: number; komsu: number[]; merkez: [number, number] }[];
  eyaletler: { ad: string; bolgeler: number[] }[];
  birlikler: KatalogBirlik[];
  savastaki: number[];
  teknolojiler: { ad: string; esanlam: string[] }[];
  ekipman: { ad: string; aile: string }[];
  mallar: { ad: string; esanlam: readonly string[] }[];
  projeler: { ad: string; esanlam: readonly string[] }[];
  sablonlar: { ad: string; esanlam: string[] }[];
  askerlik: string[];
  ekonomi: string[];
  secili: number[];
  teklifler: { id: number; kimden: number; tur: number; ad: string }[];
  vergi: number; // S ölçekli mevcut oran
  butce: number[];
  askerlikMevcut: number;
}

export type Emir = { tur: string; ulke: number } & Record<string, unknown>;

export interface Yorum { emir: Emir; guven: number; ozet: string; esdeger: string }
export type Sonuc =
  | { tur: 'emir'; yorum: Yorum; alternatif: Yorum[] }
  | { tur: 'belirsiz'; secenekler: Yorum[]; neden: string }
  | { tur: 'soru'; konu: string; ulke?: number; bolge?: number; metin: string }
  | { tur: 'zaman'; birim: 'gun' | 'hafta' | 'ay' | 'yil' | 'olay'; adet: number; esdeger: string }
  | { tur: 'sistem'; komut: 'kaydet' | 'yukle' | 'yardim' | 'iptal'; esdeger: string }
  | { tur: 'bilgi'; metin: string }
  | { tur: 'ret'; neden: string; oneriler: string[]; tanimsiz: true };

// ---------- Sözlük ----------
interface Fiil { kok: string[]; niyet: string[] }
const FIILLER: Fiil[] = [
  { kok: ['saldir'], niyet: ['saldir'] }, { kok: ['taarruz', 'et'], niyet: ['saldir'] }, { kok: ['hucum', 'et'], niyet: ['saldir'] },
  { kok: ['ele', 'gecir'], niyet: ['saldir'] }, { kok: ['isgal', 'et'], niyet: ['saldir'] }, { kok: ['fethet'], niyet: ['saldir'] }, { kok: ['kusat'], niyet: ['saldir'] },
  { kok: ['git'], niyet: ['hareket'] }, { kok: ['gid'], niyet: ['hareket'] }, { kok: ['ilerle'], niyet: ['hareket', 'zaman'] }, { kok: ['yuru'], niyet: ['hareket'] },
  { kok: ['gonder'], niyet: ['hareket'] }, { kok: ['tasi'], niyet: ['hareket'] }, { kok: ['kaydir'], niyet: ['hareket'] }, { kok: ['konuslan'], niyet: ['hareket'] },
  { kok: ['konuslandir'], niyet: ['hareket'] }, { kok: ['yerlestir'], niyet: ['hareket'] }, { kok: ['yerles'], niyet: ['hareket'] }, { kok: ['intikal', 'et'], niyet: ['hareket'] },
  { kok: ['sevk', 'et'], niyet: ['hareket'] }, { kok: ['hareket', 'et'], niyet: ['hareket'] }, { kok: ['yonel'], niyet: ['hareket'] }, { kok: ['ulas'], niyet: ['hareket'] },
  { kok: ['savun'], niyet: ['savun'] }, { kok: ['koru'], niyet: ['savun'] }, { kok: ['tut'], niyet: ['savun'] },
  { kok: ['dur'], niyet: ['dur'] }, { kok: ['durdur'], niyet: ['dur', 'uretimDur'] }, { kok: ['geri', 'cekil'], niyet: ['geriCekil'] }, { kok: ['cekil'], niyet: ['geriCekil', 'anlasmaBoz'] }, { kok: ['geri', 'cek'], niyet: ['geriCekil'] },
  { kok: ['kur'], niyet: ['birlikKur', 'insa', 'teklif'] }, { kok: ['olustur'], niyet: ['birlikKur', 'gerekce'] }, { kok: ['egit'], niyet: ['birlikKur'] }, { kok: ['topla'], niyet: ['birlikKur'] },
  { kok: ['yetistir'], niyet: ['birlikKur'] }, { kok: ['hazirla'], niyet: ['birlikKur', 'gerekce'] }, { kok: ['acil'], niyet: [] },
  { kok: ['terhis', 'et'], niyet: ['terhis'] }, { kok: ['dagit'], niyet: ['terhis'] }, { kok: ['lagvet'], niyet: ['terhis'] },
  { kok: ['uret'], niyet: ['uretim', 'gerekce'] }, { kok: ['imal', 'et'], niyet: ['uretim'] }, { kok: ['uydur'], niyet: ['gerekce'] },
  { kok: ['arastir'], niyet: ['arastir'] }, { kok: ['gelistir'], niyet: ['arastir'] }, { kok: ['calis'], niyet: ['arastir'] },
  { kok: ['insa', 'et'], niyet: ['insa'] }, { kok: ['yukselt'], niyet: ['vergiArt', 'insa', 'askerlikArt'] },
  { kok: ['artir'], niyet: ['vergiArt', 'askerlikArt', 'uretim', 'butce'] }, { kok: ['arttir'], niyet: ['vergiArt', 'askerlikArt', 'uretim', 'butce'] },
  { kok: ['azalt'], niyet: ['vergiAz', 'askerlikAz', 'uretimAz', 'butce', 'sandboxEksi'] }, { kok: ['dusur'], niyet: ['vergiAz', 'askerlikAz'] }, { kok: ['indir'], niyet: ['vergiAz'] },
  { kok: ['ayarla'], niyet: ['vergi', 'butce', 'uretim'] }, { kok: ['belirle'], niyet: ['vergi', 'butce'] }, { kok: ['ayir'], niyet: ['butce', 'uretim'] }, { kok: ['ver'], niyet: ['butce', 'teklif', 'uretim'] }, { kok: ['cikar'], niyet: ['uretim', 'sandboxEksi'] },
  { kok: ['yap'], niyet: ['vergi', 'insa', 'teklif', 'baris', 'askerlik', 'ekonomi', 'isgalPol', 'uretim', 'tutum'] },
  { kok: ['gec'], niyet: ['ekonomi', 'askerlik', 'zaman'] }, { kok: ['uygula'], niyet: ['karne', 'ekonomi', 'askerlik', 'isgalPol'] }, { kok: ['baslat'], niyet: ['karne', 'gerekce', 'uretim', 'arastir'] },
  { kok: ['ilan', 'et'], niyet: ['savasIlan', 'ekonomi'] },
  { kok: ['oner'], niyet: ['teklif', 'baris'] }, { kok: ['teklif', 'et'], niyet: ['teklif', 'baris'] }, { kok: ['imzala'], niyet: ['teklif', 'baris'] },
  { kok: ['iste'], niyet: ['teklif', 'baris'] }, { kok: ['talep', 'et'], niyet: ['teklif', 'baris'] },
  { kok: ['satin', 'al'], niyet: ['satinAl', 'ekipmanAl'] }, { kok: ['al'], niyet: ['satinAl', 'ekipmanAl', 'borcAl', 'saldir'] }, { kok: ['ithal', 'et'], niyet: ['satinAl'] }, { kok: ['getir'], niyet: ['satinAl'] },
  { kok: ['sat'], niyet: ['sat'] }, { kok: ['ihrac', 'et'], niyet: ['sat'] },
  { kok: ['boz'], niyet: ['anlasmaBoz'] }, { kok: ['iptal', 'et'], niyet: ['anlasmaBoz', 'iptal'] }, { kok: ['feshet'], niyet: ['anlasmaBoz'] }, { kok: ['bitir'], niyet: ['anlasmaBoz'] },
  { kok: ['kaldir'], niyet: ['karneKaldir', 'anlasmaBoz'] }, { kok: ['kapat'], niyet: ['otoKapat', 'karneKaldir', 'uretimDur'] }, { kok: ['ac'], niyet: ['otoAc'] },
  { kok: ['kabul', 'et'], niyet: ['kabul'] }, { kok: ['onayla'], niyet: ['kabul'] }, { kok: ['reddet'], niyet: ['ret'] }, { kok: ['geri', 'cevir'], niyet: ['ret'] },
  { kok: ['ode'], niyet: ['borcOde'] }, { kok: ['ekle'], niyet: ['sandbox'] }, { kok: ['sil'], niyet: ['sandboxEksi'] },
  { kok: ['yonet'], niyet: ['otoAc'] }, { kok: ['kaydet'], niyet: ['kaydet'] }, { kok: ['bekle'], niyet: ['zaman'] }, { kok: ['atla'], niyet: ['zaman'] },
  { kok: ['oyna'], niyet: ['zaman'] }, { kok: ['ilerlet'], niyet: ['zaman'] }, { kok: ['devam', 'et'], niyet: ['zaman'] }, { kok: ['benimse'], niyet: ['tutum'] }, { kok: ['takin'], niyet: ['tutum'] },
];
const DOLGU = new Set(['lutfen', 'hemen', 'derhal', 'artik', 'simdi', 've', 'de', 'da', 'icin', 'bir', 'tane', 'adet', 'ile', 'sonra', 'birlikte', 'olarak', 'karsi', 'dogru', 'kadar', 'tum', 'butun', 'her', 'bu', 'su', 'o']);

interface Varlik { tur: string; id: number; hal: Hal; i0: number; i1: number; ad: string }

/** Bakanlık adları (motor BAKAN sırası: ekonomi, araştırma, üretim, ordu, inşa). */
export const BAKANLIK = ['Maliye', 'Araştırma', 'İmalat', 'Harbiye', 'Bayındırlık'] as const;
interface Ad { anahtar: string[]; tur: string; id: number; ad: string }

function adlar(k: Katalog): Ad[] {
  const out: Ad[] = [];
  const ekleAd = (metin: string, tur: string, id: number, ad = metin) => {
    const t = sozcukler(metin).map((x) => x.k);
    if (t.length) out.push({ anahtar: t, tur, id, ad });
  };
  k.ulkeler.forEach((u, i) => { ekleAd(u.ad, 'ulke', i, u.kisa); ekleAd(u.kisa, 'ulke', i, u.kisa); ekleAd(u.kod, 'ulke', i, u.kisa); ekleAd(u.sifat, 'ulke', i, u.kisa); });
  k.bolgeler.forEach((b, i) => ekleAd(b.ad, 'bolge', i));
  k.eyaletler.forEach((e, i) => ekleAd(e.ad, 'eyalet', i));
  k.birlikler.forEach((b) => ekleAd(b.ad, 'birlik', b.id));
  k.teknolojiler.forEach((t, i) => { ekleAd(t.ad, 'tek', i); for (const e of t.esanlam) ekleAd(e, 'tek', i, t.ad); });
  k.ekipman.forEach((e, i) => ekleAd(e.ad, 'ekip', i));
  ekleAd('tüfek', 'ekip', 0, 'Piyade silahı I'); ekleAd('top', 'ekip', 5, 'Sahra topu'); ekleAd('makineli', 'ekip', 4, 'Makineli tüfek');
  k.mallar.forEach((m, i) => { for (const e of m.esanlam) ekleAd(e, 'mal', i, m.ad); });
  k.projeler.forEach((p, i) => { for (const e of p.esanlam) ekleAd(e, 'proje', i, p.ad); });
  k.sablonlar.forEach((s, i) => { for (const e of s.esanlam) ekleAd(e, 'sablon', i, s.ad); });
  k.askerlik.forEach((a, i) => ekleAd(a, 'askerlik', i));
  ekleAd('seferberlik', 'seferberlik', 0);
  // bakanlıklar: alan adı + bakan sözcüğü birlikte (en uzun eşleşme) — tek başına alan adları başka anlamlara ayrılmış
  BAKANLIK.forEach((a, i) => { for (const f of ['bakanı', 'bakanını', 'bakanlığı', 'bakanlığını', 'bakanlık', 'bakan']) ekleAd(`${a} ${f}`, 'bakanAlan', i, a); });
  k.ekonomi.forEach((a, i) => { ekleAd(`${a} ekonomi`, 'ekonomi', i, a); ekleAd(`${a} ekonomisi`, 'ekonomi', i, a); });
  ekleAd('savaş ekonomisi', 'ekonomi', 2, 'Savaş'); ekleAd('topyekûn', 'ekonomi', 3, 'Topyekûn'); ekleAd('topyekun savaş', 'ekonomi', 3, 'Topyekûn'); ekleAd('kısmi seferberlik', 'ekonomi', 1, 'Kısmi'); ekleAd('barış ekonomisi', 'ekonomi', 0, 'Sivil');
  [['yumuşak', 0], ['dengeli', 1], ['sert', 2]].forEach(([a, i]) => ekleAd(a as string, 'isgal', i as number));
  [['ticaret', 0], ['ticaret anlaşması', 0], ['saldırmazlık', 1], ['saldırmazlık paktı', 1], ['geçiş', 2], ['geçiş hakkı', 2], ['askerî geçiş', 2], ['askeri geçiş hakkı', 2], ['garanti', 3], ['bağımsızlık garantisi', 3], ['ittifak', 4]].forEach(([a, i]) => ekleAd(a as string, 'anlasma', i as number));
  [['dostane', 0], ['dost', 0], ['nötr', 1], ['tarafsız', 1], ['soğuk', 2], ['düşmanca', 3], ['düşman', 3]].forEach(([a, i]) => ekleAd(a as string, 'tutum', i as number));
  [['bilim', 0], ['bilime', 0], ['eğitim', 1], ['eğitime', 1], ['altyapı', 2], ['tarım', 2], ['sosyal', 3], ['güvenlik', 3]].forEach(([a, i]) => ekleAd(a as string, 'butce', i as number));
  [['hazine', 'hazine'], ['para', 'hazine'], ['altın', 'hazine'], ['siyasi güç', 'pg'], ['pg', 'pg'], ['huzur', 'huzur'], ['istikrar', 'huzur'], ['destek', 'destek'], ['meşruiyet', 'mesru'], ['insan gücü', 'insan'], ['asker', 'insan']].forEach(([a, i]) => out.push({ anahtar: sozcukler(a!).map((x) => x.k), tur: 'kaynak', id: ['hazine', 'pg', 'huzur', 'destek', 'mesru', 'insan'].indexOf(i!), ad: a! }));
  for (const [a, t] of [['vergi', 'vergi'], ['vergi oranı', 'vergi'], ['vergiler', 'vergi'], ['karne', 'karne'], ['gerekçe', 'gerekce'], ['savaş gerekçesi', 'gerekce'], ['bahane', 'gerekce'], ['savaş', 'savas'], ['barış', 'baris'], ['beyaz barış', 'beyaz'], ['beyaz', 'beyaz'], ['teslim', 'teslimT'], ['taviz', 'taviz'], ['borç', 'borc'], ['kredi', 'borc'], ['üretim', 'uretimS'], ['üretimi', 'uretimS'], ['askerlik', 'askerlikS'], ['askerlik yasası', 'askerlikS'], ['ekonomi', 'ekonomiS'], ['işgal politikası', 'isgalS'], ['işgal', 'isgalS'], ['cephe', 'cephe'], ['cepheyi', 'cephe'], ['otomatik', 'otomatik'], ['otomasyon', 'otomatik'], ['takviye', 'takviye'], ['teklif', 'teklifS'], ['teklifi', 'teklifS'], ['haftalık', 'kalici'], ['her hafta', 'kalici'], ['sürekli', 'kalici'], ['düzenli', 'kalici'], ['sandbox', 'sandboxS'], ['hile', 'sandboxS'], ['birlik', 'birlikS'], ['birlikler', 'tumBirlik'], ['birliklerim', 'tumBirlik'], ['ordu', 'tumBirlik'], ['ordum', 'tumBirlik'], ['ordular', 'tumBirlik'], ['askerlerim', 'tumBirlik'], ['seçili', 'secili'], ['seçilen', 'secili'], ['fabrika', 'fabrikaS'], ['tutum', 'tutumS'], ['oyun', 'oyun'], ['bütçe', 'butceS']] as const) out.push({ anahtar: sozcukler(a).map((x) => x.k), tur: t, id: 0, ad: a });
  return out;
}

const EK_RE = /^[a-z]{0,8}$/;
function eslestir(toks: Token[], liste: Ad[]): Varlik[] {
  const out: Varlik[] = [];
  const kullanildi = new Set<number>();
  // en uzun eşleşme önce
  const sirali = [...liste].sort((a, b) => b.anahtar.length - a.anahtar.length || b.anahtar.join('').length - a.anahtar.join('').length);
  for (let i = 0; i < toks.length; i++) {
    if (kullanildi.has(i)) continue;
    let best: { ad: Ad; ek: string; son: number } | null = null;
    const adaylar: { ad: Ad; ek: string; son: number }[] = [];
    for (const ad of sirali) {
      const n = ad.anahtar.length;
      if (i + n > toks.length) continue;
      let ok = true, ek = '';
      for (let j = 0; j < n; j++) {
        const t = toks[i + j]!, a = ad.anahtar[j]!;
        if (j < n - 1) { if (t.k !== a) { ok = false; break; } continue; }
        if (t.k === a) { ek = t.ek; continue; }
        if (t.kesme) { ok = false; break; }
        if (a.length < 4 || !t.k.startsWith(a)) { ok = false; break; }
        const kalan = t.k.slice(a.length);
        if (!EK_RE.test(kalan)) { ok = false; break; }
        ek = kalan;
      }
      if (!ok) continue;
      const c = { ad, ek, son: i + n - 1 };
      if (!best) best = c;
      if (best && n === best.ad.anahtar.length && (ad.ad !== best.ad.ad || ad.tur !== best.ad.tur)) adaylar.push(c);
    }
    if (!best) continue;
    for (let j = i; j <= best.son; j++) kullanildi.add(j);
    out.push({ tur: best.ad.tur, id: best.ad.id, hal: halCoz(best.ek), i0: i, i1: best.son, ad: best.ad.ad });
    for (const a of adaylar) if (a !== best && a.son === best.son) out.push({ tur: a.ad.tur, id: a.ad.id, hal: halCoz(a.ek), i0: i, i1: a.son, ad: a.ad.ad });
    i = best.son;
  }
  return out;
}

interface FiilBulgu { fiil: Fiil; kip: KipSonuc; i0: number; i1: number }
function fiilBul(toks: Token[], dolu: Set<number>): FiilBulgu | null {
  // Türkçe SOV: sondan başa, dolgu sözcükleri atla
  for (let i = toks.length - 1; i >= 0; i--) {
    const t = toks[i]!;
    if (DOLGU.has(t.k) && i > 0) continue;
    let enIyi: FiilBulgu | null = null;
    for (const f of FIILLER) {
      const n = f.kok.length;
      const i0 = i - n + 1;
      if (i0 < 0) continue;
      let ok = true;
      for (let j = 0; j < n - 1; j++) if (toks[i0 + j]!.k !== f.kok[j]) { ok = false; break; }
      if (!ok) continue;
      const son = f.kok[n - 1]!;
      const govde = t.k;
      let ek: string;
      if (govde === son) ek = '';
      else if (govde.startsWith(son)) ek = govde.slice(son.length);
      else if (son === 'et' && govde.startsWith('ed')) ek = govde.slice(2);
      else if (son.endsWith('t') && govde.startsWith(son.slice(0, -1) + 'd')) ek = govde.slice(son.length);
      else continue;
      if (n === 1 && dolu.has(i)) continue;
      const kip = kipCoz(ek, i === toks.length - 1, toks[i + 1]?.k ?? '');
      if (!kip) continue;
      if (!enIyi || f.kok.join('').length > enIyi.fiil.kok.join('').length) enIyi = { fiil: f, kip, i0, i1: i };
    }
    if (enIyi) return enIyi;
    if (!DOLGU.has(t.k)) {
      // son anlamlı sözcük fiil değilse bir önceki sözcüğe bakılır (en çok 2 sözcük)
      if (toks.length - 1 - i >= 2) return null;
    }
  }
  return null;
}

const SORU_SOZ = new Set(['ne', 'neden', 'nicin', 'niye', 'nasil', 'kac', 'hangi', 'hangisi', 'nerede', 'kim', 'nedir', 'mi', 'mu', 'misin', 'musun', 'miyiz', 'muyuz', 'midir', 'mudur']);

function soruMu(metin: string, toks: Token[]): boolean {
  if (metin.includes('?')) return true;
  if (toks.length > 1 && toks.some((t) => SORU_SOZ.has(t.k) && !t.kesme)) return true;
  return toks.some((t) => /^m[iu](s[iu]n|y[iu]z|d[iu]r|y[iu]m|s[iu]n[iu]z)?$/.test(t.k));
}

function soruKonu(toks: Token[], v: Varlik[]): { konu: string; ulke?: number; bolge?: number } {
  const ks = toks.map((t) => t.k).join(' ');
  const u = v.find((x) => x.tur === 'ulke');
  const b = v.find((x) => x.tur === 'bolge');
  const r = (konu: string) => ({ konu, ulke: u?.id, bolge: b?.id });
  if (/huzur|istikrar|isyan|grev|halk/.test(ks)) return r('huzur');
  if (/gida|kitlik|ac|yiyecek|tahil/.test(ks)) return r('gida');
  if (/para|hazine|gelir|gider|butce|borc|vergi/.test(ks)) return r('hazine');
  if (/ordu|asker|birlik|tumen|insan gucu/.test(ks)) return r('ordu');
  if (/savas|cephe|kazan|kaybed|muharebe/.test(ks)) return r('savas');
  if (/tehdit|niyet|plan|saldiracak|tehlike/.test(ks)) return r('tehdit');
  if (/ne yapmali|ne yapsam|oner|tavsiye|yapmaliyim|yapmaliyiz/.test(ks)) return r('oneri');
  if (/uretim|sanayi|fabrika|celik|komur|muhimmat/.test(ks)) return r('sanayi');
  if (/arastir|teknoloji/.test(ks)) return r('arastirma');
  if (/iliski|gorus|diplomasi|ittifak|dost/.test(ks)) return r('diplomasi');
  if (u) return r('ulke');
  if (b) return r('bolge');
  return r('genel');
}

const ORNEKLER: { kod: string; metin: string }[] = [
  { kod: 'saldir', metin: 'Tunçkale\'ye saldır' }, { kod: 'hareket', metin: '1. Piyade Tümeni Akyurt\'a gitsin' },
  { kod: 'savun', metin: 'Akyurt\'u savun' }, { kod: 'birlikKur', metin: '2 piyade tümeni kur' },
  { kod: 'vergi', metin: 'Vergiyi %20 yap' }, { kod: 'askerlik', metin: 'Askerlik yasasını kapsamlı yap' },
  { kod: 'ekonomi', metin: 'Savaş ekonomisine geç' }, { kod: 'satinAl', metin: '500 gıda satın al' },
  { kod: 'sat', metin: '200 kömür sat' }, { kod: 'teklif', metin: 'Kızılova ile ticaret anlaşması öner' },
  { kod: 'savasIlan', metin: 'Demirhan\'a savaş ilan et' }, { kod: 'baris', metin: 'Demirhan\'a beyaz barış öner' },
  { kod: 'gerekce', metin: 'Mavikıyı\'ya karşı gerekçe hazırla' }, { kod: 'arastir', metin: 'Seri üretimi araştır' },
  { kod: 'uretim', metin: 'Mühimmat üretimini 4 fabrikaya çıkar' }, { kod: 'insa', metin: 'Akyurt\'a askerî fabrika inşa et' },
  { kod: 'karne', metin: 'Karne uygula' }, { kod: 'zaman', metin: '1 ay ilerle' }, { kod: 'tutum', metin: 'Demirhan\'a düşmanca tutum al' },
  { kod: 'otoCephe', metin: 'Cepheyi otomatik yönet' }, { kod: 'butce', metin: 'Bilime %40 ayır' }, { kod: 'borcAl', metin: '1 milyon borç al' },
];

function trigram(s: string): Set<string> {
  const k = ` ${katla(s)} `;
  const o = new Set<string>();
  for (let i = 0; i + 3 <= k.length; i++) o.add(k.slice(i, i + 3));
  return o;
}
function benzerlik(a: string, b: string): number {
  const x = trigram(a), y = trigram(b);
  let k = 0; for (const t of x) if (y.has(t)) k++;
  return k / Math.max(1, x.size + y.size - k);
}
export function enYakinUc(metin: string): string[] {
  return ORNEKLER.map((o) => ({ o, s: benzerlik(metin, o.metin) })).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.o.metin);
}

// ---------- Ana ayrıştırıcı ----------
export function ayristir(metin: string, k: Katalog): Sonuc {
  const toks = sozcukler(metin);
  if (toks.length === 0) return { tur: 'ret', neden: 'Boş komut.', oneriler: enYakinUc(''), tanimsiz: true };
  const v = eslestir(toks, adlar(k));
  const dolu = new Set<number>();
  for (const x of v) for (let i = x.i0; i <= x.i1; i++) dolu.add(i);
  if (soruMu(metin, toks)) { const s = soruKonu(toks, v); return { tur: 'soru', ...s, metin }; }
  const has = (t: string) => v.some((x) => x.tur === t);
  const get = (t: string) => v.filter((x) => x.tur === t);
  const sayilar = toks.filter((t) => t.sayi !== undefined && !t.yuzde).map((t) => t.sayi!);
  const yuzde = toks.find((t) => t.yuzde)?.sayi;
  const ks = toks.map((t) => t.k);
  // sistem komutları
  if (ks.length <= 2 && (ks[0] === 'kaydet' || (ks[0] === 'oyunu' && ks[1]?.startsWith('kaydet')))) return { tur: 'sistem', komut: 'kaydet', esdeger: 'Kaydet' };
  if (ks[0] === 'yardim' || ks[0] === 'komutlar') return { tur: 'sistem', komut: 'yardim', esdeger: 'Yardım' };
  // zaman
  const birim = toks.find((t) => /^(gun|hafta|ay|yil|sene)/.test(t.k) && !/^(ayir|ayar|yildiz)/.test(t.k));
  const zamanFiil = /(ilerle|ilerlet|gec|bekle|atla|oyna|devam)/.test(ks.join(' ')) && !has('bolge') && !has('birlik') && !has('ekonomi') && !has('askerlik');
  if (zamanFiil && (birim || /olay|devam/.test(ks.join(' ')))) {
    const b = !birim ? 'olay' : birim.k.startsWith('gun') ? 'gun' : birim.k.startsWith('hafta') ? 'hafta' : birim.k.startsWith('ay') ? 'ay' : 'yil';
    const adet = b === 'olay' ? 1 : Math.max(1, Math.min(b === 'gun' ? 365 : b === 'hafta' ? 52 : b === 'ay' ? 12 : 3, Math.floor(sayilar[0] ?? 1)));
    const bAd = { gun: 'gün', hafta: 'hafta', ay: 'ay', yil: 'yıl', olay: '' }[b];
    return { tur: 'zaman', birim: b as 'gun', adet, esdeger: b === 'olay' ? 'Sonraki önemli olaya kadar ilerle' : `${adet} ${bAd} ilerle` };
  }
  const fiil = fiilBul(toks, dolu);
  const niyetler = new Set<string>(fiil?.fiil.niyet ?? []);
  // ad kökenli niyetler (fiilsiz veya genel fiilli)
  if (has('vergi')) { niyetler.add('vergi'); }
  if (has('karne')) niyetler.add('karne');
  if (has('savas') && fiil?.fiil.kok.join(' ') === 'ilan et') niyetler.add('savasIlan');
  if (has('baris') || has('beyaz')) niyetler.add('baris');
  if (has('gerekce')) niyetler.add('gerekce');
  if (has('askerlik') || has('askerlikS')) niyetler.add('askerlik');
  if (has('ekonomi')) niyetler.add('ekonomi');
  if (has('isgal') && has('isgalS')) niyetler.add('isgalPol');
  if (has('cephe') || (has('otomatik') && !has('mal'))) niyetler.add('otoCephe');
  if (has('kaynak') && (fiil?.fiil.niyet.includes('sandbox') || fiil?.fiil.niyet.includes('sandboxEksi') || has('sandboxS'))) niyetler.add('sandbox');
  if (has('mal') && (fiil?.fiil.niyet.includes('sandbox') || has('sandboxS'))) niyetler.add('sandbox');
  if (has('borc')) { if (fiil?.fiil.kok[0] === 'ode') niyetler.add('borcOde'); else niyetler.add('borcAl'); }
  if (has('tutum') && !has('isgal')) niyetler.add('tutum');
  if (has('uretimS') && (has('ekip') || has('mal'))) niyetler.add('uretim');
  if (has('teklifS') && fiil && (fiil.fiil.niyet.includes('kabul') || fiil.fiil.niyet.includes('ret'))) niyetler.add(fiil.fiil.niyet.includes('kabul') ? 'kabul' : 'ret');
  if (fiil?.fiil.niyet.includes('kabul')) niyetler.add('kabul');
  if (fiil?.fiil.niyet.includes('ret')) niyetler.add('ret');
  if (has('butce') && (yuzde !== undefined)) niyetler.add('butce');
  if (has('bakanAlan')) niyetler.add('bakan');
  if (niyetler.size === 0) {
    return { tur: 'ret', neden: fiil ? 'Bu eylem katalogda yok.' : 'Komutta bilinen bir eylem bulunamadı.', oneriler: enYakinUc(metin), tanimsiz: true };
  }
  const olumsuz = fiil?.kip.olumsuz ?? false;
  let yorumlar: Yorum[] = [];
  const nedenler: string[] = [];
  const ctx: Baglam = { k, v, toks, sayilar, yuzde, olumsuz, fiil, has, get, metin };
  for (const n of niyetler) {
    const y = niyetKur(n, ctx);
    if (typeof y === 'string') { if (y.startsWith('BILGI:')) return { tur: 'bilgi', metin: y.slice(6) }; nedenler.push(y); continue; }
    if (y) for (const x of Array.isArray(y) ? y : [y]) yorumlar.push(x);
  }
  const gorulen = new Set<string>();
  yorumlar = yorumlar.filter((x) => { if (gorulen.has(x.esdeger)) return false; gorulen.add(x.esdeger); return true; });
  if (yorumlar.length === 0) return { tur: 'ret', neden: nedenler[0] ?? 'Komut anlaşıldı ama gerekli bilgi eksik (hedef, miktar veya ülke).', oneriler: enYakinUc(metin), tanimsiz: true };
  // anlamsız kalan sözcükler güveni düşürür
  const anlamli = toks.filter((t, i) => !dolu.has(i) && !DOLGU.has(t.k) && t.sayi === undefined && t.sira === undefined && !(fiil && i >= fiil.i0 && i <= fiil.i1));
  const ceza = Math.min(0.3, anlamli.length * 0.08);
  for (const y of yorumlar) y.guven = Math.max(0, Math.min(1, y.guven - ceza));
  yorumlar.sort((a, b) => b.guven - a.guven);
  const ilk = yorumlar[0]!;
  const ikinci = yorumlar[1];
  if (ilk.guven >= 0.8 && (!ikinci || ilk.guven - ikinci.guven >= 0.1)) return { tur: 'emir', yorum: ilk, alternatif: yorumlar.slice(1, 3) };
  if (ilk.guven < 0.4) return { tur: 'ret', neden: 'Komut yeterince açık değil.', oneriler: [...yorumlar.slice(0, 1).map((y) => y.esdeger), ...enYakinUc(metin)].slice(0, 3), tanimsiz: true };
  return { tur: 'belirsiz', secenekler: yorumlar.slice(0, 3), neden: ikinci && ilk.guven - ikinci.guven < 0.1 ? 'Birden çok yorum mümkün.' : 'Emin değilim; doğru yorumu seçin.' };
}

interface Baglam {
  k: Katalog; v: Varlik[]; toks: Token[]; sayilar: number[]; yuzde?: number; olumsuz: boolean;
  fiil: FiilBulgu | null; has: (t: string) => boolean; get: (t: string) => Varlik[]; metin: string;
}

function birlikSec(c: Baglam, hedef?: number): { ids: number[]; acik: boolean; tanim: string } {
  const { k, v } = c;
  const adli = v.filter((x) => x.tur === 'birlik').map((x) => x.id);
  if (adli.length) return { ids: adli, acik: true, tanim: adli.map((id) => k.birlikler.find((b) => b.id === id)?.ad ?? '').join(', ') };
  // "Akyurt'taki birlikler"
  const yer = v.find((x) => x.tur === 'bolge' && (x.hal === 'bulunmaKi' || x.hal === 'bulunma') && x.id !== hedef);
  if (yer) { const ids = k.birlikler.filter((b) => b.bolge === yer.id).map((b) => b.id); return { ids, acik: ids.length > 0, tanim: `${ekle(k.bolgeler[yer.id]!.ad, 'bulunmaKi')} birlikler` }; }
  if (c.has('secili') && k.secili.length) return { ids: k.secili, acik: true, tanim: 'seçili birlikler' };
  if (c.has('tumBirlik') || c.toks.some((t) => t.k === 'tum' || t.k === 'butun')) {
    if (hedef !== undefined) {
      // hedefe komşu veya en yakın birlikler: tüm ordu yerine sınır birlikleri
      const kom = new Set(k.bolgeler[hedef]!.komsu);
      const yakin = k.birlikler.filter((b) => kom.has(b.bolge));
      if (yakin.length && !c.toks.some((t) => t.k === 'tum' || t.k === 'butun')) return { ids: yakin.map((b) => b.id), acik: true, tanim: 'hedefe komşu birlikler' };
    }
    return { ids: k.birlikler.map((b) => b.id), acik: true, tanim: 'tüm birlikler' };
  }
  if (k.secili.length) return { ids: k.secili, acik: true, tanim: 'seçili birlikler' };
  if (hedef !== undefined) {
    const kom = new Set(k.bolgeler[hedef]!.komsu);
    const yakin = k.birlikler.filter((b) => kom.has(b.bolge));
    if (yakin.length) return { ids: yakin.map((b) => b.id), acik: false, tanim: 'hedefe komşu birlikler' };
    // komşu birlik yoksa hedefe en yakın en çok dört birlik
    const [hx, hy] = k.bolgeler[hedef]!.merkez;
    const sirali = [...k.birlikler].sort((a, b) => {
      const [ax, ay] = k.bolgeler[a.bolge]!.merkez, [bx, by] = k.bolgeler[b.bolge]!.merkez;
      return (ax - hx) ** 2 + (ay - hy) ** 2 - ((bx - hx) ** 2 + (by - hy) ** 2) || a.id - b.id;
    });
    if (sirali.length) return { ids: sirali.slice(0, 4).map((b) => b.id), acik: false, tanim: 'hedefe en yakın birlikler' };
  }
  return { ids: [], acik: false, tanim: '' };
}

function y(emir: Emir, guven: number, ozet: string, k: Katalog): Yorum {
  return { emir, guven, ozet, esdeger: emirMetni(emir, k) };
}

function niyetKur(n: string, c: Baglam): Yorum | Yorum[] | string | null {
  const { k, v, sayilar, yuzde, olumsuz, has, get } = c;
  const P = k.oyuncu;
  const fiilVar = c.fiil !== null;
  const taban = fiilVar ? 0.6 : 0.45;
  const ulkeHedef = v.find((x) => x.tur === 'ulke' && x.id !== P && (x.hal === 'yonelme' || x.hal === 'belirtme' || x.hal === 'yalin'));
  const ulkeIle = v.find((x) => x.tur === 'ulke' && x.id !== P);
  switch (n) {
    case 'saldir': case 'hareket': case 'savun': case 'geriCekil': case 'dur': {
      const bolgeler = get('bolge').filter((x) => x.hal !== 'bulunmaKi' && x.hal !== 'ayrilma');
      const hedef = bolgeler.find((x) => x.hal === 'yonelme' || x.hal === 'belirtme') ?? bolgeler.find((x) => x.hal === 'yalin') ?? bolgeler[0];
      const out: Yorum[] = [];
      if (olumsuz && (n === 'saldir' || n === 'hareket')) {
        // olumsuz emir (C02): ilgili hedefe yönelik mevcut emirleri iptal eder; yoksa bilgi verir
        const hedefBolgeler = hedef ? [hedef.id] : ulkeHedef ? k.bolgeler.map((b, i) => ({ b, i })).filter(({ b }) => b.kontrol === ulkeHedef.id).map(({ i }) => i) : [];
        const adli = get('birlik').map((x) => x.id);
        const ids = k.birlikler.filter((x) => (adli.length ? adli.includes(x.id) : true) && x.hedef >= 0 && (hedefBolgeler.length === 0 || hedefBolgeler.includes(x.hedef))).map((x) => x.id);
        const ad = hedef ? ekle(hedef.ad, 'yonelme') : ulkeHedef ? ekle(k.ulkeler[ulkeHedef.id]!.kisa, 'yonelme') : '';
        if (!ids.length) return `BILGI:${ad ? `${ad} yönelik` : 'Hiçbir'} bekleyen ${n === 'saldir' ? 'taarruz' : 'hareket'} emri yok; değişiklik yapılmadı.`;
        return y({ tur: 'dur', ulke: P, birlikler: ids }, taban + 0.3, `${ad} yönelik emirler iptal`, k);
      }
      if (n === 'dur') {
        const b = birlikSec(c, hedef?.id);
        if (!b.ids.length) return 'Durdurulacak birlik bulunamadı.';
        return y({ tur: 'dur', ulke: P, birlikler: b.ids }, taban + (b.acik ? 0.3 : 0.1), `${b.tanim || 'birlikler'} durdurulur`, k);
      }
      if (n === 'geriCekil') {
        const b = birlikSec(c);
        if (!b.ids.length) return null;
        // en yakın kendi bölgesine: Worker hedefi çözer (hedef -1 → en yakın dost bölge)
        const ilk = k.birlikler.find((x) => x.id === b.ids[0]);
        const dost = ilk ? [ilk.bolge, ...k.bolgeler[ilk.bolge]!.komsu].find((r) => k.bolgeler[r]!.kontrol === P) : undefined;
        if (dost === undefined) return null;
        return y({ tur: 'hareket', ulke: P, birlikler: b.ids, hedef: dost }, taban + 0.2, 'geri çekilme', k);
      }
      // ülke hedefli saldırı: o ülkenin bize en yakın bölgesi
      if (!hedef && n === 'saldir' && ulkeHedef) {
        const dusmanBolge = k.bolgeler.map((b, i) => ({ b, i })).filter(({ b }) => b.kontrol === ulkeHedef.id && b.komsu.some((r) => k.bolgeler[r]!.kontrol === P));
        if (!k.savastaki.includes(ulkeHedef.id)) {
          out.push(y({ tur: 'savasIlan', ulke: P, hedef: ulkeHedef.id }, taban + 0.1, `${k.ulkeler[ulkeHedef.id]!.kisa} ile savaşta değilsiniz — önce savaş ilanı`, k));
        }
        for (const { i } of dusmanBolge.slice(0, 2)) {
          const b = birlikSec(c, i);
          if (b.ids.length) out.push(y({ tur: 'saldir', ulke: P, birlikler: b.ids, hedef: i }, taban + 0.1, `${k.bolgeler[i]!.ad} sınır bölgesine taarruz`, k));
        }
        return out;
      }
      if (!hedef) return 'Hedef bölge belirtilmedi.';
      const b = birlikSec(c, hedef.id);
      if (!b.ids.length) {
        const yer = v.find((x) => x.tur === 'bolge' && x.hal === 'bulunmaKi');
        return yer ? `${ekle(yer.ad, 'bulunma')} birliğiniz yok.` : 'Emir verilecek birliğiniz yok.';
      }
      const dusman = k.savastaki.includes(k.bolgeler[hedef.id]!.kontrol);
      let g = taban + (b.acik ? 0.25 : 0.12) + (hedef.hal !== 'yalin' ? 0.05 : 0);
      const ayniAd = get('ulke').find((x) => x.i0 === hedef!.i0);
      if (ayniAd) g -= 0.15; // hem ülke hem bölge adı: belirsizlik
      if (n === 'savun') {
        out.push(y({ tur: 'hareket', ulke: P, birlikler: b.ids, hedef: hedef.id, durus: 0 }, g, `${hedef.ad} savunması`, k));
      } else if (n === 'saldir' || (n === 'hareket' && dusman)) {
        out.push(y({ tur: 'saldir', ulke: P, birlikler: b.ids, hedef: hedef.id }, n === 'saldir' ? g : g - 0.05, `${hedef.ad} taarruzu (${b.tanim})`, k));
      } else out.push(y({ tur: 'hareket', ulke: P, birlikler: b.ids, hedef: hedef.id }, g, `${hedef.ad} hedefine intikal (${b.tanim})`, k));
      const dusmanDegil = !dusman && k.bolgeler[hedef.id]!.kontrol !== P;
      if (n === 'saldir' && dusmanDegil && !ayniAd) out.push(y({ tur: 'savasIlan', ulke: P, hedef: k.bolgeler[hedef.id]!.kontrol }, g, `${hedef.ad} ${ekle(k.ulkeler[k.bolgeler[hedef.id]!.kontrol]!.kisa, 'ilgi')}; önce savaş ilanı`, k));
      if (!b.acik && k.birlikler.length > b.ids.length) out.push(y({ tur: n === 'saldir' ? 'saldir' : 'hareket', ulke: P, birlikler: k.birlikler.map((x) => x.id), hedef: hedef.id }, g - 0.08, 'tüm birlikler', k));
      if (ayniAd && n === 'saldir' && !k.savastaki.includes(ayniAd.id) && ayniAd.id !== P) out.push(y({ tur: 'savasIlan', ulke: P, hedef: ayniAd.id }, g - 0.05, `${k.ulkeler[ayniAd.id]!.kisa} devletine savaş ilanı`, k));
      return out;
    }
    case 'birlikKur': {
      const sab = get('sablon')[0];
      if (!sab && !has('birlikS')) return null;
      const adet = Math.max(1, Math.min(10, Math.floor(sayilar[0] ?? 1)));
      const yer = v.find((x) => x.tur === 'bolge' && (x.hal === 'bulunma' || x.hal === 'yonelme'));
      const e: Emir = { tur: 'birlikKur', ulke: P, sablon: sab?.id ?? 0, adet };
      if (yer) e.bolge = yer.id;
      return y(e, taban + (sab ? 0.3 : 0.15), `${adet} ${k.sablonlar[sab?.id ?? 0]!.ad}`, k);
    }
    case 'terhis': {
      const b = birlikSec(c);
      if (!b.ids.length || !b.acik) return null;
      return y({ tur: 'terhis', ulke: P, birlikler: b.ids }, taban + 0.25, b.tanim, k);
    }
    case 'vergi': case 'vergiArt': case 'vergiAz': {
      if (!has('vergi')) return null;
      let oran: number;
      if (yuzde !== undefined || sayilar.length) oran = Math.round((yuzde ?? sayilar[0]!) * 10_000);
      else if (n === 'vergiArt') oran = k.vergi + 20_000;
      else if (n === 'vergiAz') oran = k.vergi - 20_000;
      else return null;
      if (olumsuz) return null;
      return y({ tur: 'vergi', ulke: P, oran }, taban + 0.3, `vergi %${oran / 10_000}`, k);
    }
    case 'askerlik': case 'askerlikArt': case 'askerlikAz': {
      if (has('seferberlik')) return null;
      const a = get('askerlik')[0];
      let yasa = a?.id;
      if (yasa === undefined && n === 'askerlikArt' && has('askerlikS')) yasa = Math.min(4, k.askerlikMevcut + 1);
      if (yasa === undefined && n === 'askerlikAz' && has('askerlikS')) yasa = Math.max(0, k.askerlikMevcut - 1);
      if (yasa === undefined) return null;
      return y({ tur: 'askerlik', ulke: P, yasa }, taban + (has('askerlikS') ? 0.3 : 0.15), `askerlik: ${k.askerlik[yasa]}`, k);
    }
    case 'ekonomi': {
      const e = get('ekonomi')[0];
      if (!e) return null;
      return y({ tur: 'ekonomi', ulke: P, yasa: e.id }, taban + 0.3, `ekonomi: ${k.ekonomi[e.id]}`, k);
    }
    case 'karne': return y({ tur: 'karne', ulke: P, acik: olumsuz ? 0 : 1 }, taban + 0.3, olumsuz ? 'karneyi kaldır' : 'karne uygula', k);
    case 'karneKaldir': return has('karne') ? y({ tur: 'karne', ulke: P, acik: 0 }, taban + 0.3, 'karneyi kaldır', k) : null;
    case 'isgalPol': { const p = get('isgal')[0]; return p ? y({ tur: 'isgalPol', ulke: P, pol: p.id }, taban + 0.3, `işgal: ${p.ad}`, k) : null; }
    case 'butce': {
      const kalem = get('butce')[0];
      if (!kalem || yuzde === undefined) return null;
      const yeni = Math.round(yuzde * 10_000);
      const p = [...k.butce];
      const eski = p[kalem.id]!;
      const fark = yeni - eski;
      const digerTop = p.reduce((s, x, i) => (i === kalem.id ? s : s + x), 0);
      const out = p.map((x, i) => (i === kalem.id ? yeni : digerTop > 0 ? Math.round(x - (fark * x) / digerTop) : 0));
      const top = out.reduce((s, x) => s + x, 0);
      out[(kalem.id + 1) % 4]! += 1_000_000 - top;
      return y({ tur: 'butce', ulke: P, paylar: out }, taban + 0.3, `${kalem.ad} %${yuzde}`, k);
    }
    case 'uretim': case 'uretimAz': case 'uretimDur': {
      const ek = get('ekip')[0];
      const mal = get('mal').find((x) => x.id === 3);
      if (!ek && !mal) return null;
      const urun = mal ? 100 : ek!.id;
      const fab = sayilar.length ? Math.round(sayilar[0]! * 1000) : (n === 'uretimDur' || olumsuz ? 0 : 2000);
      if (n === 'uretimDur' || olumsuz) return y({ tur: 'uretim', ulke: P, urun, fabrika: 0 }, taban + 0.3, 'üretim durur', k);
      return y({ tur: 'uretim', ulke: P, urun, fabrika: fab }, taban + (sayilar.length ? 0.3 : 0.2), 'üretim hattı', k);
    }
    case 'arastir': { const t = get('tek')[0]; return t ? y({ tur: 'arastir', ulke: P, tek: t.id }, taban + 0.3, `araştırma: ${t.ad}`, k) : null; }
    case 'insa': {
      const p = get('proje')[0];
      const b = get('bolge')[0];
      if (!p) return null;
      if (!b) return null;
      return y({ tur: 'insa', ulke: P, proje: p.id, bolge: b.id }, taban + 0.3, `${p.ad}: ${b.ad}`, k);
    }
    case 'satinAl': case 'sat': {
      const m = get('mal')[0];
      if (!m) return null;
      const miktar = Math.floor(sayilar[0] ?? 0);
      if (miktar <= 0) return null;
      const kim = v.find((x) => x.tur === 'ulke' && x.id !== P && (n === 'satinAl' ? x.hal === 'ayrilma' : x.hal === 'yonelme'));
      const e: Emir = { tur: n, ulke: P, mal: m.id, miktar, kalici: has('kalici') ? 1 : 0 };
      if (kim) e.kimden = kim.id;
      if (olumsuz) return null;
      return y(e, taban + 0.3, `${miktar} ${m.ad}`, k);
    }
    case 'ekipmanAl': {
      const ekip = get('ekip')[0];
      const kim = v.find((x) => x.tur === 'ulke' && x.id !== P && x.hal === 'ayrilma');
      if (!ekip || !kim) return null;
      return y({ tur: 'teklif', ulke: P, kime: kim.id, tip: 14, ekip: ekip.id, adet: Math.floor(sayilar[0] ?? 100) }, taban + 0.32, 'ekipman alımı', k);
    }
    case 'teklif': {
      const a = get('anlasma')[0];
      if (!a || !ulkeIle) return null;
      return y({ tur: 'teklif', ulke: P, kime: ulkeIle.id, tip: a.id }, taban + 0.3, `${a.ad} → ${k.ulkeler[ulkeIle.id]!.kisa}`, k);
    }
    case 'savasIlan': {
      if (!ulkeHedef || olumsuz) return null;
      return y({ tur: 'savasIlan', ulke: P, hedef: ulkeHedef.id }, taban + 0.32, `${k.ulkeler[ulkeHedef.id]!.kisa}: savaş ilanı`, k);
    }
    case 'gerekce': {
      if (!has('gerekce') || !ulkeIle) return null;
      return y({ tur: 'gerekce', ulke: P, hedef: ulkeIle.id }, taban + 0.32, `${k.ulkeler[ulkeIle.id]!.kisa}: gerekçe`, k);
    }
    case 'baris': {
      if (!(has('baris') || has('beyaz')) || !ulkeIle) return null;
      const istenen = get('bolge').map((x) => x.id).filter((r) => k.bolgeler[r]!.sahip === ulkeIle.id);
      const tur = has('teslimT') ? 2 : istenen.length ? 1 : 0;
      return y({ tur: 'baris', ulke: P, kime: ulkeIle.id, barisTur: tur, bolgeler: istenen }, taban + 0.32, 'barış', k);
    }
    case 'tutum': {
      const t = get('tutum')[0];
      if (!t || !ulkeIle) return null;
      return y({ tur: 'tutum', ulke: P, kime: ulkeIle.id, tutum: t.id }, taban + 0.3, `tutum: ${t.ad}`, k);
    }
    case 'anlasmaBoz': {
      const a = get('anlasma')[0];
      if (!a || !ulkeIle) return null;
      return y({ tur: 'anlasmaBoz', ulke: P, kime: ulkeIle.id, tip: a.id }, taban + 0.3, `${a.ad} bozulur`, k);
    }
    case 'borcAl': { if (!has('borc')) return null; const m = Math.floor(sayilar[0] ?? 0); return m > 0 ? y({ tur: 'borcAl', ulke: P, miktar: m }, taban + 0.3, 'borç', k) : 'Borç miktarı belirtilmedi.'; }
    case 'borcOde': { const m = Math.floor(sayilar[0] ?? 1e15); return y({ tur: 'borcOde', ulke: P, miktar: m }, taban + 0.3, 'borç ödeme', k); }
    case 'kabul': case 'ret': {
      const kim = get('ulke')[0];
      const t = k.teklifler.find((x) => !kim || x.kimden === kim.id);
      if (!t) return null;
      return y({ tur: 'teklifYanit', ulke: P, teklif: t.id, kabul: n === 'kabul' ? 1 : 0 }, taban + 0.3, `${t.ad} ${n === 'kabul' ? 'kabul' : 'ret'}`, k);
    }
    case 'bakan': {
      const a = get('bakanAlan')[0];
      if (!a) return null;
      const kapat = olumsuz || c.fiil?.fiil.niyet.includes('otoKapat') || c.toks.some((t) => t.k === 'gorevden');
      return y({ tur: 'bakan', ulke: P, alan: a.id, acik: kapat ? 0 : 1 }, taban + 0.35, `${BAKANLIK[a.id]} bakanlığı`, k);
    }
    case 'otoCephe': case 'otoAc': case 'otoKapat': {
      if (!has('cephe') && !has('otomatik')) return null;
      const acik = n === 'otoKapat' || olumsuz ? 0 : 1;
      if (has('takviye')) return y({ tur: 'otoTakviye', ulke: P, acik }, taban + 0.3, 'otomatik takviye', k);
      return y({ tur: 'otoCephe', ulke: P, acik }, taban + 0.3, 'cephe otomasyonu', k);
    }
    case 'sandbox': case 'sandboxEksi': {
      const kay = get('kaynak')[0];
      const mal = get('mal')[0];
      const ek = get('ekip')[0];
      const miktar = Math.floor(sayilar[0] ?? 0);
      if (miktar <= 0) return null;
      const isaret = n === 'sandboxEksi' || c.fiil?.fiil.niyet.includes('sandboxEksi') ? -1 : 1;
      const alan = kay ? ['hazine', 'pg', 'huzur', 'destek', 'mesru', 'insan'][kay.id]! : mal ? ['gida', 'celik', 'komur', 'muhimmat'][mal.id]! : ek ? `ekip${ek.id}` : '';
      if (!alan) return null;
      const hedefU = v.find((x) => x.tur === 'ulke' && (x.hal === 'ilgi' || x.hal === 'yonelme'));
      const e: Emir = { tur: 'sandbox', ulke: P, alan, miktar: isaret * miktar };
      if (hedefU) e.hedefUlke = hedefU.id;
      return y(e, taban + 0.3, `Sandbox ${alan}`, k);
    }
  }
  return null;
}

// ---------- Eşdeğer komut metni (C04) ----------
export function emirMetni(e: Emir, k: Katalog): string {
  const u = (i: unknown) => k.ulkeler[Number(i)]?.kisa ?? '?';
  const b = (i: unknown) => k.bolgeler[Number(i)]?.ad ?? '?';
  const birl = (ids: unknown) => {
    const a = (ids as number[]) ?? [];
    if (a.length === 0) return 'birlikler';
    if (a.length === 1) return k.birlikler.find((x) => x.id === a[0])?.ad ?? 'birlik';
    if (a.length === k.birlikler.length && a.length > 1) return 'Tüm birlikler';
    const ilk = k.birlikler.find((x) => x.id === a[0]);
    return ilk && a.every((id) => k.birlikler.find((x) => x.id === id)?.bolge === ilk.bolge) ? `${ekle(b(ilk.bolge), 'bulunmaKi')} ${a.length} birlik` : `${a.length} birlik`;
  };
  const sayi = (x: number) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  switch (e.tur) {
    case 'saldir': return `${birl(e.birlikler)} ${ekle(b(e.hedef), 'yonelme')} saldırsın`;
    case 'hareket': return Number(e.durus ?? -1) === 0 && e.durus !== undefined ? `${birl(e.birlikler)} ${ekle(b(e.hedef), 'belirtme')} savunsun` : `${birl(e.birlikler)} ${ekle(b(e.hedef), 'yonelme')} gitsin`;
    case 'dur': return `${birl(e.birlikler)} dursun`;
    case 'terhis': return `${birl(e.birlikler)} terhis edilsin`;
    case 'durus': return `${birl(e.birlikler)} ${['hattı tutsun', 'esnek savunmaya geçsin', 'saldırı duruşuna geçsin', 'garnizon olsun'][Number(e.durus)]}`;
    case 'birlikKur': return `${e.bolge !== undefined ? `${ekle(b(e.bolge), 'bulunma')} ` : ''}${Number(e.adet) > 1 ? `${e.adet} ` : ''}${k.sablonlar[Number(e.sablon)]?.ad.toLocaleLowerCase('tr')} kur`;
    case 'vergi': return `Vergiyi %${Number(e.oran) / 10_000} yap`;
    case 'butce': return `Bütçe: ${(e.paylar as number[]).map((p, i) => `${['bilim', 'eğitim', 'altyapı', 'sosyal'][i]} %${Math.round(p / 10_000)}`).join(', ')}`;
    case 'askerlik': return `Askerlik yasasını ${k.askerlik[Number(e.yasa)]?.toLocaleLowerCase('tr')} yap`;
    case 'ekonomi': return `${k.ekonomi[Number(e.yasa)]} ekonomisine geç`;
    case 'karne': return Number(e.acik) ? 'Karne uygula' : 'Karneyi kaldır';
    case 'isgalPol': return `İşgal politikasını ${['yumuşak', 'dengeli', 'sert'][Number(e.isgalPol ?? e.pol)]} yap`;
    case 'uretim': { const ad = Number(e.urun) === 100 ? 'Mühimmat' : k.ekipman[Number(e.urun)]?.ad ?? '?'; return Number(e.fabrika) === 0 ? `${ad} üretimini durdur` : `${ad} üretimine ${Number(e.fabrika) / 1000} fabrika ayır`; }
    case 'arastir': return `${k.teknolojiler[Number(e.tek)]?.ad} araştır`;
    case 'insa': return `${ekle(b(e.bolge), 'yonelme')} ${k.projeler[Number(e.proje)]?.ad.toLocaleLowerCase('tr')} inşa et`;
    case 'satinAl': return `${e.kimden !== undefined && Number(e.kimden) >= 0 ? ekle(u(e.kimden), 'ayrilma') + ' ' : ''}${Number(e.kalici) ? 'her hafta ' : ''}${sayi(Number(e.miktar))} ${k.mallar[Number(e.mal)]?.ad.toLocaleLowerCase('tr')} satın al`;
    case 'sat': return `${Number(e.kalici) ? 'Her hafta ' : ''}${sayi(Number(e.miktar))} ${k.mallar[Number(e.mal)]?.ad.toLocaleLowerCase('tr')} sat`;
    case 'teklif': {
      const t = Number(e.tip);
      if (t === 14) return `${ekle(u(e.kime), 'ayrilma')} ${e.adet} ${k.ekipman[Number(e.ekip)]?.ad.toLocaleLowerCase('tr')} satın al`;
      const ad = ['ticaret anlaşması', 'saldırmazlık paktı', 'askerî geçiş hakkı', 'bağımsızlık garantisi', 'ittifak'][t];
      return `${ekle(u(e.kime), 'yonelme')} ${ad} öner`;
    }
    case 'teklifYanit': { const t = k.teklifler.find((x) => x.id === e.teklif); return `${t ? ekle(u(t.kimden), 'ilgi') + ' teklifini' : 'Teklifi'} ${Number(e.kabul) ? 'kabul et' : 'reddet'}`; }
    case 'gerekce': return `${ekle(u(e.hedef), 'yonelme')} karşı gerekçe hazırla`;
    case 'savasIlan': return `${ekle(u(e.hedef), 'yonelme')} savaş ilan et`;
    case 'baris': { const r = (e.bolgeler as number[]) ?? []; return `${ekle(u(e.kime), 'yonelme')} ${['beyaz barış', 'barış', 'teslim'][Number(e.barisTur)]} öner${r.length ? ` (${r.map(b).join(', ')} karşılığında)` : ''}`; }
    case 'tutum': return `${ekle(u(e.kime), 'yonelme')} ${['dostane', 'nötr', 'soğuk', 'düşmanca'][Number(e.tutum)]} tutum al`;
    case 'anlasmaBoz': return `${u(e.kime)} ile ${['ticaret anlaşmasını', 'saldırmazlık paktını', 'geçiş hakkını', 'garantiyi', 'ittifakı'][Number(e.tip)]} boz`;
    case 'borcAl': return `${sayi(Number(e.miktar))} altın borç al`;
    case 'borcOde': return `${sayi(Number(e.miktar))} altın borç öde`;
    case 'otoCephe': return Number(e.acik) ? 'Cepheyi otomatik yönet' : 'Cephe otomasyonunu kapat';
    case 'bakan': return `${BAKANLIK[Number(e.alan)] ?? '?'} bakanlığını ${Number(e.acik) ? 'aç' : 'kapat'}`;
    case 'otoTakviye': return Number(e.acik) ? 'Otomatik takviyeyi aç' : 'Otomatik takviyeyi kapat';
    case 'kaliciGida': return Number(e.acik) ? 'Gıda azalınca otomatik satın al' : 'Gıda otomasyonunu kapat';
    case 'harcama': return `Gelir fazlasının %${Number(e.oran) / 10_000} kadarını harca`;
    case 'olaySec': return `Olay seçeneği ${Number(e.secim) + 1}`;
    case 'sandbox': { const m = Number(e.miktar); const al: Record<string, string> = { hazine: 'hazineye', pg: 'siyasi güce', gida: 'gıdaya', muhimmat: 'mühimmata', celik: 'çeliğe', komur: 'kömüre', huzur: 'huzura', destek: 'desteğe', mesru: 'meşruiyete', insan: 'insan gücüne' }; return `Sandbox: ${e.hedefUlke !== undefined ? ekle(u(e.hedefUlke), 'ilgi') + ' ' : ''}${al[String(e.alan)] ?? String(e.alan)} ${sayi(Math.abs(m))} ${m >= 0 ? 'ekle' : 'çıkar'}`; }
  }
  return e.tur;
}

export const KOMUT_ORNEKLERI = ORNEKLER;
export type { Hal };
