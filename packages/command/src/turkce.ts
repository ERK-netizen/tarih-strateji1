// Türkçe biçimbilim yardımcıları: küçültme, katlama, sayı okuma, hal eki üretimi ve çözümleme.

export function kucuk(s: string): string {
  return s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
}
/** Karşılaştırma anahtarı: Türkçe harfler ASCII'ye katlanır (Türkçe klavyesiz yazım için). */
export function katla(s: string): string {
  return kucuk(s).replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
}

const SAYI: Record<string, number> = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30, kirk: 40,
  elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90, yuz: 100, bin: 1000, milyon: 1_000_000, yarim: 0.5,
};
const SIRA: Record<string, number> = { birinci: 1, ikinci: 2, ucuncu: 3, dorduncu: 4, besinci: 5, altinci: 6, yedinci: 7, sekizinci: 8, dokuzuncu: 9, onuncu: 10 };

export interface Token { ham: string; k: string; ek: string; kesme: boolean; sayi?: number; yuzde?: boolean; sira?: number }

/** Metni sözcüklere böler; kesme işaretiyle ayrılan eki ayrı tutar; sayıları okur. */
export function sozcukler(metin: string): Token[] {
  const temiz = metin.replace(/[’`´]/g, "'").replace(/[!.,;:?()"«»]/g, (m) => (m === '.' ? '.' : ' ')).replace(/\s+/g, ' ').trim();
  const out: Token[] = [];
  for (let parca of temiz.split(' ')) {
    if (!parca) continue;
    let yuzde = false;
    if (parca.startsWith('%')) { yuzde = true; parca = parca.slice(1); }
    // 1. → sıra sayısı
    const sira = /^(\d+)\.$/.exec(parca);
    if (sira) { out.push({ ham: parca, k: parca, ek: '', kesme: false, sira: Number(sira[1]) }); continue; }
    parca = parca.replace(/\.$/, '');
    let ek = '', kesme = false, govde = parca;
    const ix = parca.indexOf("'");
    if (ix > 0) { govde = parca.slice(0, ix); ek = katla(parca.slice(ix + 1)); kesme = true; }
    const k = katla(govde);
    const t: Token = { ham: parca, k, ek, kesme, yuzde };
    const sayi = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$/.exec(govde);
    if (sayi) t.sayi = Number(sayi[1]!.replace(/\./g, '')) + (sayi[2] ? Number(`0.${sayi[2]}`) : 0);
    else if (k in SAYI) t.sayi = SAYI[k];
    else if (k in SIRA) t.sira = SIRA[k];
    out.push(t);
  }
  // sayı sözcüklerini birleştir: "iki yüz elli bin" → 250000
  const birlesik: Token[] = [];
  for (let i = 0; i < out.length; i++) {
    const t = out[i]!;
    if (t.sayi === undefined || t.yuzde || /\d/.test(t.k)) { birlesik.push(t); continue; }
    let toplam = 0, grup = 0, j = i;
    for (; j < out.length; j++) {
      const v = out[j]!.sayi;
      if (v === undefined || /\d/.test(out[j]!.k)) break;
      if (v === 1000 || v === 1_000_000) { toplam += (grup || 1) * v; grup = 0; }
      else if (v === 100) grup = (grup || 1) * 100;
      else grup += v;
    }
    birlesik.push({ ...t, sayi: toplam + grup, ham: out.slice(i, j).map((x) => x.ham).join(' '), ek: out[j - 1]!.ek });
    i = j - 1;
  }
  // rakam + çarpan: "2 milyon", "500 bin"
  for (let i = 0; i + 1 < birlesik.length; i++) {
    const a = birlesik[i]!, b = birlesik[i + 1]!;
    if (a.sayi !== undefined && /\d/.test(a.k) && (b.k === 'bin' || b.k === 'milyon')) {
      a.sayi *= b.k === 'bin' ? 1000 : 1_000_000; a.ham += ' ' + b.ham; birlesik.splice(i + 1, 1);
    }
  }
  // "yüzde 25"
  for (let i = 0; i + 1 < birlesik.length; i++) {
    if (birlesik[i]!.k === 'yuzde' && birlesik[i + 1]!.sayi !== undefined) { birlesik[i + 1]!.yuzde = true; birlesik.splice(i, 1); }
  }
  return birlesik;
}

// ---------- Hal ekleri ----------
export type Hal = 'yalin' | 'yonelme' | 'ayrilma' | 'bulunma' | 'belirtme' | 'ilgi' | 'vasita' | 'bulunmaKi';

const UNLU = 'aeıioöuü';
function sonUnlu(s: string): string {
  const k = kucuk(s);
  for (let i = k.length - 1; i >= 0; i--) if (UNLU.includes(k[i]!)) return k[i]!;
  return 'e';
}
const KALIN = 'aıou';
const SERT = 'fstkçşhp';

/** Ada hal eki ekler (özel adlarda kesme işaretiyle). */
export function ekle(ad: string, hal: Hal, ozel = true): string {
  if (hal === 'yalin') return ad;
  const u = sonUnlu(ad);
  const kalin = KALIN.includes(u);
  const son = kucuk(ad).slice(-1);
  const unluyle = UNLU.includes(son);
  const sert = SERT.includes(son);
  const k = ozel ? "'" : '';
  const dar = u === 'a' || u === 'ı' ? 'ı' : u === 'e' || u === 'i' ? 'i' : u === 'o' || u === 'u' ? 'u' : 'ü';
  switch (hal) {
    case 'yonelme': return ad + k + (unluyle ? 'y' : '') + (kalin ? 'a' : 'e');
    case 'ayrilma': return ad + k + (sert ? 't' : 'd') + (kalin ? 'an' : 'en');
    case 'bulunma': return ad + k + (sert ? 't' : 'd') + (kalin ? 'a' : 'e');
    case 'bulunmaKi': return ad + k + (sert ? 't' : 'd') + (kalin ? 'a' : 'e') + 'ki';
    case 'belirtme': return ad + k + (unluyle ? 'y' : '') + dar;
    case 'ilgi': return ad + k + (unluyle ? 'n' : '') + dar + 'n';
    case 'vasita': return ad + k + (unluyle ? 'y' : '') + (kalin ? 'la' : 'le');
  }
}

/** Katlanmış ekten hali çözer. */
export function halCoz(ek: string): Hal {
  const e = ek.replace(/^(n|y|s)/, (m) => m);
  if (!ek) return 'yalin';
  if (/^(n?d|t)[ae]ki$/.test(ek) || /^n?[dt][ae]ki/.test(ek)) return 'bulunmaKi';
  if (/^n?[dt][ae]n$/.test(ek) || /^n?[dt][ae]n/.test(ek)) return 'ayrilma';
  if (/^n?[dt][ae]$/.test(ek)) return 'bulunma';
  if (/^(y|n)?[ae]$/.test(ek) || /^s?in[ae]$/.test(ek) || /^s?[iu]n[ae]$/.test(ek)) return 'yonelme';
  if (/^(y|n|s)?[iu]$/.test(ek) || /^s?[iu]n[iu]$/.test(ek)) return 'belirtme';
  if (/^n?[iu]n$/.test(ek)) return 'ilgi';
  if (/^(y)?l[ae]$/.test(ek)) return 'vasita';
  void e;
  return 'yalin';
}

// ---------- Fiil kipi çözümleme ----------
export interface KipSonuc { olumsuz: boolean; kip: string; isimFiil: boolean }

/**
 * Fiil gövdesinden sonra gelen ek zinciri (katlanmış). Kural (C02):
 * - boş → 2. tekil emir;  -(y)ın/-(y)ınız → 2. çoğul emir;  -sın → 3. tekil emir;  -(y)alım → 1. çoğul istek;
 * - -malı/-meli → gereklilik;  -(y)acak → gelecek;  -ıl/-n + emir → edilgen emir;
 * - -ma/-me tek başına cümle sonunda → OLUMSUZ emir; -ma/-me + hal/iyelik eki (ması, maya, masını) → isim-fiil (olumlu);
 * - -mak/-mek → mastar (olumlu istek: "saldırmak istiyorum").
 */
export function kipCoz(ek: string, cumleSonu: boolean, sonraki: string): KipSonuc | null {
  let e = ek;
  // edilgen
  let edilgen = false;
  const ed = /^(il|ul|in|un|n|l)(?=[a-z]|$)/.exec(e);
  if (ed && (e.length > ed[0].length || ed[0] === 'n')) {
    const geri = e.slice(ed[0].length);
    if (/^(s[iu]n|m[ae]|[iu]r|[iu]yor|[ae]c[ae]k|m[ae]l[iu]|d[iu])/.test(geri) || geri === '') { e = geri; edilgen = true; }
  }
  void edilgen;
  if (e === '') return { olumsuz: false, kip: 'emir', isimFiil: false };
  // mastar
  if (/^m[ae]k/.test(e)) return { olumsuz: false, kip: 'mastar', isimFiil: true };
  // olumsuzluk
  if (/^m[ae]/.test(e)) {
    const r = e.slice(2);
    if (r === '') {
      const istek = /^(emri|emir|istiyorum|isterim|lazim|gerek|gerekiyor|karari|kararini)/.test(sonraki);
      if (istek) return { olumsuz: false, kip: 'isim-fiil', isimFiil: true };
      return cumleSonu || sonraki === '' ? { olumsuz: true, kip: 'emir', isimFiil: false } : { olumsuz: false, kip: 'isim-fiil', isimFiil: true };
    }
    if (/^(s[iu](n[iu])?|y[ae]|s[iu]n[ae]|n[iu]n|y[iu]|s[iu]nd[ae])$/.test(r)) return { olumsuz: false, kip: 'isim-fiil', isimFiil: true };
    if (/^l[iu]/.test(r)) return { olumsuz: false, kip: 'gereklilik', isimFiil: false }; // -malı/-meli (olumlu gereklilik)
    if (/^(y[iu]n(iz)?|s[iu]n(l[ae]r)?|y[ae]l[iu]m|m[ae]l[iu]|y[ae]c[ae]k|d[iu]|z|y[iu]z|y[iu]n[iu]z)/.test(r)) return { olumsuz: true, kip: 'emir', isimFiil: false };
    return { olumsuz: true, kip: 'emir', isimFiil: false };
  }
  if (/^(y)?[iu]n([iu]z)?$/.test(e)) return { olumsuz: false, kip: 'emir2c', isimFiil: false };
  if (/^s[iu]n(l[ae]r)?$/.test(e)) return { olumsuz: false, kip: 'emir3', isimFiil: false };
  if (/^(y)?[ae]l[iu]m$/.test(e)) return { olumsuz: false, kip: 'istek', isimFiil: false };
  if (/^m[ae]l[iu](y[iu]z|s[iu]n)?$/.test(e)) return { olumsuz: false, kip: 'gereklilik', isimFiil: false };
  if (/^(y)?[ae]c[ae]k/.test(e)) return { olumsuz: false, kip: 'gelecek', isimFiil: false };
  if (/^[iu]y?[iu]?yor/.test(e) || /^[iu]r/.test(e) || /^[ae]r/.test(e)) return { olumsuz: false, kip: 'genis', isimFiil: false };
  if (/^(y)?[iu]$/.test(e)) return { olumsuz: false, kip: 'isim', isimFiil: true };
  return null;
}
