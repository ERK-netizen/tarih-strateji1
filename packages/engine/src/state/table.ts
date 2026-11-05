// Bölüm 5.6: yapı-dizisi (SoA) tablolar. Kimlik = (yuva, kuşak). Kapasite büyümesi deterministiktir.

export type ColType = 'f64' | 'i32' | 'u32' | 'u8';
export type ColDef = readonly [string, ColType];
type Arr = Float64Array | Int32Array | Uint32Array | Uint8Array;

function mk(t: ColType, n: number): Arr {
  switch (t) {
    case 'f64': return new Float64Array(n);
    case 'i32': return new Int32Array(n);
    case 'u32': return new Uint32Array(n);
    case 'u8': return new Uint8Array(n);
  }
}

/** Kimlik kodlama: yuva + kuşak × 2^20 (yuva < 2^20, kuşak < 2^32). Güvenli tamsayıdır. */
export const YUVA_MAX = 1 << 20;
export function idOf(slot: number, gen: number): number { return gen * YUVA_MAX + slot; }
export function slotOf(id: number): number { return id % YUVA_MAX; }
export function genOf(id: number): number { return Math.floor(id / YUVA_MAX); }

export class Table<K extends string = string> {
  readonly name: string;
  readonly defs: readonly ColDef[];
  cap: number;
  hw = 0; // en yüksek kullanılan yuva + 1
  c: Record<K, Float64Array>;
  ci: Record<string, Arr>;
  gen: Uint32Array;
  alive: Uint8Array;
  free: number[] = [];

  constructor(name: string, defs: readonly (readonly [K, ColType])[], cap = 16) {
    this.name = name;
    this.defs = defs;
    this.cap = cap;
    this.ci = {};
    for (const [k, t] of defs) this.ci[k] = mk(t, cap);
    this.c = this.ci as unknown as Record<K, Float64Array>;
    this.gen = new Uint32Array(cap);
    this.alive = new Uint8Array(cap);
  }

  reserve(n: number): void { while (this.cap < n) this.grow(); }

  private grow(): void {
    const nc = this.cap * 2;
    for (const [k, t] of this.defs) {
      const a = mk(t, nc);
      a.set(this.ci[k] as never);
      this.ci[k] = a;
    }
    this.c = this.ci as unknown as Record<K, Float64Array>;
    const g = new Uint32Array(nc); g.set(this.gen); this.gen = g;
    const al = new Uint8Array(nc); al.set(this.alive); this.alive = al;
    this.cap = nc;
  }

  /** Yeni yuva: serbest listeden en küçük yuva (deterministik), yoksa sona. Alanlar sıfırlanır. */
  alloc(): number {
    let slot: number;
    if (this.free.length > 0) {
      // serbest liste ikili min-yığındır: en küçük yuva O(log n)
      const f = this.free;
      slot = f[0]!;
      const son = f.pop()!;
      if (f.length) {
        f[0] = son;
        let i = 0;
        for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < f.length && f[l]! < f[m]!) m = l; if (r < f.length && f[r]! < f[m]!) m = r; if (m === i) break; [f[i], f[m]] = [f[m]!, f[i]!]; i = m; }
      }
      this.gen[slot] = this.gen[slot]! + 1;
    } else {
      if (this.hw >= this.cap) this.grow();
      slot = this.hw++;
      this.gen[slot] = 1;
    }
    for (const [k] of this.defs) (this.ci[k] as Arr)[slot] = 0;
    this.alive[slot] = 1;
    return slot;
  }

  release(slot: number): void {
    if (!this.alive[slot]) return;
    this.alive[slot] = 0;
    for (const [k] of this.defs) (this.ci[k] as Arr)[slot] = 0;
    const f = this.free;
    f.push(slot);
    let i = f.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (f[p]! <= f[i]!) break; [f[i], f[p]] = [f[p]!, f[i]!]; i = p; }
  }

  id(slot: number): number { return idOf(slot, this.gen[slot]!); }

  /** Kimlik geçerli mi? Eski kuşak referansı geçersizdir (T010). */
  resolve(id: number): number {
    const s = slotOf(id);
    if (s >= this.hw || !this.alive[s] || this.gen[s] !== genOf(id)) return -1;
    return s;
  }

  /** Canlı yuvalar, kalıcı kimlik (yuva) sırasıyla. */
  *rows(): Generator<number> {
    for (let i = 0; i < this.hw; i++) if (this.alive[i]) yield i;
  }

  list(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.hw; i++) if (this.alive[i]) out.push(i);
    return out;
  }

  count(): number {
    let n = 0;
    for (let i = 0; i < this.hw; i++) if (this.alive[i]) n++;
    return n;
  }
}

/** Sabit boyutlu tablo (bölge, eyalet, ülke): bütün yuvalar canlı. */
export function fixedTable<K extends string>(name: string, defs: readonly (readonly [K, ColType])[], n: number): Table<K> {
  const t = new Table<K>(name, defs, Math.max(1, n));
  for (let i = 0; i < n; i++) t.alloc();
  return t;
}
