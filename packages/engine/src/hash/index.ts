// Bölüm 6.6: hash.v1 — iki farklı tohumlu murmur3-32 hesabının birleşimi (64 bit). Kriptografik değildir.

function murmur3(bytes: Uint8Array, seed: number): number {
  let h = seed >>> 0;
  const n = bytes.length;
  const nblocks = n >>> 2;
  const c1 = 0xcc9e2d51, c2 = 0x1b873593;
  for (let i = 0; i < nblocks; i++) {
    const o = i * 4;
    let k = (bytes[o]! | (bytes[o + 1]! << 8) | (bytes[o + 2]! << 16) | (bytes[o + 3]! << 24)) >>> 0;
    k = Math.imul(k, c1);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, c2);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;
  }
  let k = 0;
  const t = nblocks * 4;
  const kalan = n & 3;
  if (kalan >= 3) k ^= bytes[t + 2]! << 16;
  if (kalan >= 2) k ^= bytes[t + 1]! << 8;
  if (kalan >= 1) {
    k ^= bytes[t]!;
    k = Math.imul(k, c1);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, c2);
    h ^= k;
  }
  h ^= n;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function hashV1(bytes: Uint8Array): string {
  const a = murmur3(bytes, 0x9747b28c);
  const b = murmur3(bytes, 0x5bd1e995);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** Metin için hash (anlatı hash'i). */
export function hashText(s: string): string {
  return hashV1(new TextEncoder().encode(s));
}
