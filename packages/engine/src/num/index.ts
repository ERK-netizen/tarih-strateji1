// Bölüm 6.1–6.2: sabit nokta tamsayı aritmetiği. Kanonik durumda ondalıklı sayı yoktur.
// S = oran ölçeği (10^6), P = puan ölçeği (10^3).

export const S = 1_000_000;
export const PUAN = 1_000;
export const MAX_PARA = 9_000_000_000_000;

/** Performans sayacı: soğuk yol (BigInt) çağrıları. Standart fixture'da günlük hatta 0 olmalı (T101). */
export const sayac = { sogukYol: 0 };

export function isInt(x: number): boolean {
  return Number.isSafeInteger(x);
}

export function assertInt(x: number, ad = 'değer'): number {
  if (!Number.isSafeInteger(x)) throw new Error(`Tamsayı değil veya güvenli aralık dışı: ${ad}=${x}`);
  return x === 0 ? 0 : x; // -0 → 0
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** ⌊a/b⌋ tamsayı bölmesi (b > 0), negatif a için de taban. */
export function idiv(a: number, b: number): number {
  const q = Math.floor(a / b);
  // kayan nokta bölmesi düzeltmesi
  let r = a - q * b;
  let qq = q;
  if (r < 0) { qq -= 1; r += b; }
  if (r >= b) { qq += 1; }
  return qq;
}

export interface QR { q: number; rem: number }

/** miktar × oran (r, S ölçekli), BigInt'siz. |a| ≤ 9e12, 0 ≤ r ≤ 9e8. Sonuç q + rem/S. */
export function mulRatio(a: number, r: number): QR {
  if (r < 0 || r > 900_000_000 || Math.abs(a) > MAX_PARA) {
    const v = mulDivBig(a, r, S);
    return v;
  }
  const sign = a < 0 ? -1 : 1;
  const x = Math.abs(a);
  let hi = Math.floor(x / S);
  let lo = x - hi * S;
  if (lo < 0) { hi -= 1; lo += S; }
  if (lo >= S) { hi += 1; lo -= S; }
  const t1 = hi * r;
  const t2n = lo * r;
  const t2 = Math.floor(t2n / S);
  const rem = t2n - t2 * S;
  const q = t1 + t2;
  return { q: q === 0 ? 0 : sign * q, rem: rem === 0 ? 0 : sign * rem };
}

/** Sadece tamsayı kısmı (artık atılır — yalnız korunmayan endekslerde). */
export function mr(a: number, r: number): number {
  return mulRatio(a, r).q;
}

/** miktar ÷ oran = a × S / r. r ≥ 1000. */
export function divRatio(a: number, r: number): number {
  if (r < 1000) return mulDivBig(a, S, r).q;
  const sign = a < 0 ? -1 : 1;
  const x = Math.abs(a);
  const q1 = idiv(x, r);
  const lo = x - q1 * r;
  const res = q1 * S + idiv(lo * S, r);
  if (!Number.isSafeInteger(res)) return mulDivBig(a, S, r).q;
  return res === 0 ? 0 : sign * res;
}

/** a × b / d, taban; kalan ile. d > 0. */
export function mulDiv(a: number, b: number, d: number): QR {
  const p = a * b;
  if (Number.isSafeInteger(p) && Math.abs(p) <= 9_007_199_254_740_991) {
    const q = Math.floor(p / d);
    let rem = p - q * d;
    let qq = q;
    if (rem < 0) { qq -= 1; rem += d; }
    if (rem >= d) { qq += 1; rem -= d; }
    return { q: qq === 0 ? 0 : qq, rem };
  }
  // ayrıştırma: a = q1*d + r1 → a*b/d = q1*b + r1*b/d
  const q1 = idiv(a, d);
  const r1 = a - q1 * d;
  const p2 = r1 * b;
  const t = q1 * b;
  if (Number.isSafeInteger(p2) && Number.isSafeInteger(t)) {
    const q2 = Math.floor(p2 / d);
    let rem = p2 - q2 * d;
    let qq = q2;
    if (rem < 0) { qq -= 1; rem += d; }
    const tot = t + qq;
    if (Number.isSafeInteger(tot)) return { q: tot, rem };
  }
  return mulDivBig(a, b, d);
}

function mulDivBig(a: number, b: number, d: number): QR {
  sayac.sogukYol++;
  const p = BigInt(a) * BigInt(b);
  const D = BigInt(d);
  let q = p / D;
  let rem = p - q * D;
  if (rem < 0n) { q -= 1n; rem += D; }
  return { q: Number(q), rem: Number(rem) };
}

/** Yarıda çifte yuvarlama: n/d. Math.round yasaktır. */
export function roundHalfEven(n: number, d: number): number {
  const q = idiv(n, d);
  const r = n - q * d;
  const twice = r * 2;
  if (twice > d) return q + 1;
  if (twice < d) return q;
  return q % 2 === 0 ? q : q + 1;
}

/** Tamsayı karekök (Newton), ⌊√x⌋. */
export function sqrtInt(x: number): number {
  if (x < 0) throw new Error('negatif karekök');
  if (x < 2) return x;
  // Tamsayı Newton: başlangıç 2^⌈bit/2⌉ ≥ √x, monoton azalır.
  let bits = 0;
  for (let t = x; t > 0; t = Math.floor(t / 2)) bits++;
  let r = 2 ** Math.ceil(bits / 2);
  for (;;) {
    const y = Math.floor((r + Math.floor(x / r)) / 2);
    if (y >= r) break;
    r = y;
  }
  while (r * r > x) r--;
  while ((r + 1) * (r + 1) <= x) r++;
  return r;
}

/** Oran karekökü: √q (S ölçekli giriş ve çıkış). q 16×S ile kırpılır. */
export function sqrtRatio(q: number): number {
  const qq = clamp(q, 0, 16 * S);
  return sqrtInt(qq * S);
}

/** Oran: a/b → S ölçekli (b=0 → varsayılan). */
export function ratio(a: number, b: number, varsayilan = S): number {
  if (b <= 0) return varsayilan;
  return mulDiv(a, S, b).q;
}

/** Orantılı dağıtım (en büyük artık yöntemi, eşitlikte küçük indeks önce). */
export function largestRemainder(total: number, weights: readonly number[]): number[] {
  const n = weights.length;
  const out = new Array<number>(n).fill(0);
  let wsum = 0;
  for (const w of weights) wsum += w;
  if (wsum <= 0 || total === 0) return out;
  const rems: { i: number; r: number }[] = [];
  let given = 0;
  for (let i = 0; i < n; i++) {
    const { q, rem } = mulDiv(total, weights[i]!, wsum);
    out[i] = q;
    given += q;
    rems.push({ i, r: rem });
  }
  let left = total - given;
  rems.sort((x, y) => (y.r - x.r) || (x.i - y.i));
  for (let k = 0; k < rems.length && left > 0; k++) {
    if (weights[rems[k]!.i]! > 0) { out[rems[k]!.i]!++; left--; }
  }
  return out;
}

/** Puan (×1000) için yaklaşım: hedefe adım sınırlarıyla yaklaş. */
export function approach(cur: number, target: number, up: number, down: number): number {
  if (target > cur) return Math.min(target, cur + up);
  if (target < cur) return Math.max(target, cur - down);
  return cur;
}
