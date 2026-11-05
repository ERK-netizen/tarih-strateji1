// Türkçe ad ekleri: ünlü uyumu, kaynaştırma ve ünsüz benzeşmesi. Özel adlara kesme işaretiyle eklenir.
// Yabancı adlar yazıldığı gibi okunmuş sayılır (aksanlı harfler en yakın Türkçe ünlüye indirgenir).

export type Hal = 'in' | 'i' | 'e' | 'de' | 'den' | 'le';

const UNLU: Record<string, string> = {
  a: 'a', ı: 'ı', o: 'o', u: 'u', e: 'e', i: 'i', ö: 'ö', ü: 'ü', â: 'a', á: 'a', à: 'a', ä: 'e', å: 'o', ã: 'a', ā: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e', ē: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i', ī: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o', ø: 'ö', ō: 'o', ő: 'ö', ú: 'u', ù: 'u', û: 'u', ū: 'u', ű: 'ü', æ: 'e', œ: 'ö',
};
const SERT = new Set(['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p']);
const KALIN = new Set(['a', 'ı', 'o', 'u']);

function kucuk(c: string): string {
  if (c === 'I') return 'ı';
  if (c === 'İ') return 'i';
  return c.toLowerCase();
}

/** Ek alacak sözcük: parantezli açıklama ve sondaki noktalama atılır. */
function govde(ad: string): string {
  let s = ad.trim();
  const p = s.indexOf(' (');
  if (p > 0) s = s.slice(0, p);
  return s.replace(/[.,;:!?)\]]+$/u, '');
}

/** Çok sözcüklü kurum adı iyelik ekiyle mi bitiyor (Krallığı, Cumhuriyeti, Birliği, Tümeni…)? */
function iyelikli(s: string): boolean {
  const sozcuk = s.split(/\s+/);
  if (sozcuk.length < 2 && !s.includes('\'')) return false;
  const h = [...sozcuk[sozcuk.length - 1]!].map(kucuk);
  const n = h.length;
  if (n < 3) return false;
  const z = h[n - 1]!, y = h[n - 2]!;
  return ['ı', 'i', 'u', 'ü'].includes(z) && !UNLU[y];
}

export function trEk(ad: string, hal: Hal, kurum = false): string {
  const s = govde(ad);
  const harf = [...s].map(kucuk);
  let unlu = 'e';
  for (let i = harf.length - 1; i >= 0; i--) { const u = UNLU[harf[i]!]; if (u) { unlu = u; break; } }
  let son = harf[harf.length - 1] ?? 'e';
  if (/\d/.test(son)) son = 'e';
  // kısaltma (ABD, SSCB): son harfin okunuşu (be, ce, de…) ünlüyle biter
  if (/^[A-ZÇĞİÖŞÜ]{2,5}$/u.test(s)) { if (!UNLU[son]) { unlu = 'e'; son = 'e'; } }
  const unluBiter = !!UNLU[son];
  const kalin = KALIN.has(unlu);
  const dar = unlu === 'a' || unlu === 'ı' ? 'ı' : unlu === 'e' || unlu === 'i' ? 'i' : unlu === 'o' || unlu === 'u' ? 'u' : 'ü';
  const genis = kalin ? 'a' : 'e';
  const n = kurum && iyelikli(s);
  let e: string;
  switch (hal) {
    case 'in': e = (unluBiter ? 'n' : '') + dar + 'n'; break;
    case 'i': e = (n ? 'n' : unluBiter ? 'y' : '') + dar; break;
    case 'e': e = (n ? 'n' : unluBiter ? 'y' : '') + genis; break;
    case 'de': e = n ? 'n' + 'd' + genis : (SERT.has(son) ? 't' : 'd') + genis; break;
    case 'den': e = n ? 'n' + 'd' + genis + 'n' : (SERT.has(son) ? 't' : 'd') + genis + 'n'; break;
    case 'le': e = (unluBiter ? 'y' : '') + 'l' + genis; break;
  }
  // kesme işaretinden sonra ek; ad zaten kesmeyle ek almışsa (Reich'ı) doğrudan eklenir
  const ayrac = /'[^\s]*$/u.test(s) ? '' : '\'';
  return `${s}${ayrac}${e}`;
}
/** Ülke, birlik ve kurum adı (iyelikli adlarda n kaynaştırması: Krallığı'na). */
export const trEkK = (ad: string, hal: Hal) => trEk(ad, hal, true);

/** Türkçe küçük harf (İ → i, I → ı). */
export function trKucuk(s: string): string {
  let o = '';
  for (const c of s) o += kucuk(c);
  return o;
}
