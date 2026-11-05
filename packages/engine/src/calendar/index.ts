// Bölüm 6.4: proleptik Gregoryen takvim. Birim gündür; saat yoktur. Date kullanılmaz.

export interface Tarih { y: number; m: number; d: number } // m: 1–12

export function artikYil(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

const AY_GUN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function ayGunSayisi(y: number, m: number): number {
  return m === 2 && artikYil(y) ? 29 : AY_GUN[m - 1]!;
}

/** Gün numarası: 1 Ocak 0001 = 0 (proleptik). */
export function gunNo(t: Tarih): number {
  const y = t.y - 1;
  let n = y * 365 + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  for (let m = 1; m < t.m; m++) n += ayGunSayisi(t.y, m);
  return n + t.d - 1;
}

export function tarih(gun: number): Tarih {
  // yıl tahmini sonra düzelt
  let y = Math.floor(gun / 365.2425) + 1;
  while (gunNo({ y, m: 1, d: 1 }) > gun) y--;
  while (gunNo({ y: y + 1, m: 1, d: 1 }) <= gun) y++;
  let rest = gun - gunNo({ y, m: 1, d: 1 });
  let m = 1;
  while (rest >= ayGunSayisi(y, m)) { rest -= ayGunSayisi(y, m); m++; }
  return { y, m, d: rest + 1 };
}

/** n takvim ayı ileri; hedef ayın son gününe kırpılır. */
export function ayEkle(gun: number, n: number): number {
  const t = tarih(gun);
  let m = t.m - 1 + n;
  const y = t.y + Math.floor(m / 12);
  m = ((m % 12) + 12) % 12 + 1;
  const d = Math.min(t.d, ayGunSayisi(y, m));
  return gunNo({ y, m, d });
}

export const AY_ADI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function tarihMetni(gun: number): string {
  const t = tarih(gun);
  return `${t.d} ${AY_ADI[t.m - 1]} ${t.y}`;
}

/** Haftanın günü: 0 = Pazartesi. 1 Ocak 0001 Pazartesidir (proleptik Gregoryen). */
export function haftaGunu(gun: number): number {
  return ((gun % 7) + 7) % 7;
}
