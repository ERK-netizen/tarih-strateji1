// Bölüm 6.5: anahtarlı rastlantı rng.v1. Çağrı sırasına bağlı global sayaç yoktur.
const S = 1_000_000; // oran ölçeği (num ile aynı; 5.5 gereği yerel)

export function fmix32(h0: number): number {
  let h = h0 >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Amaç kimlikleri: sistem sözleşmesinde sabit. */
export const AMAC = {
  combatRoll: 1,
  harvest: 2,
  intelNoise: 3,
  eventPick: 4,
  aiChoice: 5,
  sabotage: 6,
  lottery: 7,
  textPick: 100, // metin alanı savaş alanından ayrı
} as const;

/**
 * Anahtar: (tohum, gün, sistemId, kalıcıVarlıkId, kuşak, amaçId, olayÖrneği, sayaç).
 * Her alan 32 bitlik parçalara bölünür (gün ve kimlikler 2^32 altındadır).
 */
export function rng(
  tohum: number, gun: number, sistem: number, varlik: number,
  kusak: number, amac: number, ornek: number, sayac: number,
): number {
  let h = tohum >>> 0;
  const parts = [gun, sistem, varlik, kusak, amac, ornek, sayac];
  for (const f of parts) {
    const lo = f >>> 0;
    const hi = Math.floor(f / 4294967296) >>> 0;
    h = fmix32(h ^ lo);
    h = Math.imul(h, 0x9e3779b1) >>> 0;
    if (hi !== 0) {
      h = fmix32(h ^ hi);
      h = Math.imul(h, 0x9e3779b1) >>> 0;
    }
  }
  return fmix32(h);
}

/** ⌊u × n / 2^32⌋, n ≤ 2^21. */
export function uniformInt(u: number, n: number): number {
  return Math.floor(((u >>> 0) * n) / 4294967296);
}

export function bernoulli(u: number, pRatio: number): boolean {
  return uniformInt(u, S) < pRatio;
}

/** Muharebe çarpanı r ∈ [0,85; 1,15] (S ölçekli). */
export function combatR(u: number): number {
  return 850_000 + uniformInt(u, 300_001);
}
